import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFormattedInvoiceNumber } from "@/lib/billing";
import { getBillingSettings } from "@/lib/settings";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          plan: {
            include: {
              product: true,
              prices: { include: { currency: true } },
            },
          },
        },
      },
      coupon: true,
    },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const currencyCode = cart.currencyCode;
  const billing = await getBillingSettings();

  // Validate coupon if applied
  if (cart.coupon) {
    if (cart.coupon.maxUses && cart.coupon.used >= cart.coupon.maxUses) {
      return NextResponse.json({ error: "Coupon has reached its usage limit" }, { status: 400 });
    }
    if (cart.coupon.expiresAt && new Date(cart.coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }
  }

  // Calculate line items with prices
  const lineItems = cart.items.map((item) => {
    const price =
      item.plan.prices.find((p) => p.currencyCode === currencyCode) ??
      item.plan.prices[0];
    return {
      description: `${item.plan.product.name} — ${item.plan.name}`,
      price: price ? Number(price.price) : 0,
      setupFee: price ? Number(price.setupFee) : 0,
      quantity: 1,
      plan: item.plan,
      config: item.config,
    };
  });

  let subtotal = lineItems.reduce(
    (sum, i) => sum + i.price + i.setupFee,
    0
  );

  if (cart.coupon) {
    if (cart.coupon.type === "percent") {
      subtotal = subtotal * (1 - Number(cart.coupon.value) / 100);
    } else {
      subtotal = Math.max(0, subtotal - Number(cart.coupon.value));
    }
    subtotal = Math.round(subtotal * 100) / 100;
  }

  const dueAt = new Date(
    Date.now() + billing.invoiceDueDays * 24 * 60 * 60 * 1000
  );

  const result = await db.$transaction(async (tx) => {
    // Create invoice
    const invoice = await tx.invoice.create({
      data: {
        userId,
        currencyCode,
        status: "pending",
        dueAt,
        items: {
          create: lineItems.map((item) => ({
            description: item.description,
            price: item.price + item.setupFee,
            quantity: item.quantity,
          })),
        },
      },
    });

    // Assign formatted invoice number
    const invoiceNumber = await getFormattedInvoiceNumber(invoice.number);
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { invoiceNumber },
    });

    // Create order
    const order = await tx.order.create({
      data: {
        userId,
        invoiceId: invoice.id,
        currencyCode,
        status: "pending",
      },
    });

    // Create services as PENDING (activated on payment)
    for (const item of lineItems) {
      const servicePrice =
        item.plan.prices.find((p) => p.currencyCode === currencyCode)?.price ??
        item.plan.prices[0]?.price ??
        0;

      const service = await tx.service.create({
        data: {
          userId,
          orderId: order.id,
          productId: item.plan.productId,
          planId: item.plan.id,
          currencyCode,
          status: "pending",
          price: servicePrice,
          expiresAt: null, // set on activation
        },
      });

      // Save config options
      if (item.config && typeof item.config === "object") {
        for (const [configOptionId, value] of Object.entries(
          item.config as Record<string, string>
        )) {
          if (value) {
            await tx.serviceConfig.create({
              data: { serviceId: service.id, configOptionId, value },
            });
          }
        }
      }

      // Update invoice item to reference service
      await tx.invoiceItem.updateMany({
        where: { invoiceId: invoice.id, description: item.description },
        data: { serviceId: service.id },
      });
    }

    // Increment coupon usage
    if (cart.couponId) {
      await tx.coupon.update({
        where: { id: cart.couponId },
        data: { used: { increment: 1 } },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

    return { invoiceId: invoice.id, orderId: order.id, invoiceNumber };
  });

  // Send invoice created notification (non-blocking)
  sendNotification("invoice_created", userId, {
    invoiceNumber: result.invoiceNumber,
    amount: subtotal.toFixed(2),
    currency: currencyCode,
    invoiceUrl: `/invoices/${result.invoiceId}`,
  }).catch(console.error);

  return NextResponse.json(result, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

  // Calculate total
  let subtotal = cart.items.reduce((sum, item) => {
    const price = item.plan.prices.find(
      (p) => p.currencyCode === currencyCode
    ) ?? item.plan.prices[0];
    return sum + (price ? Number(price.price) + Number(price.setupFee) : 0);
  }, 0);

  if (cart.coupon) {
    if (cart.coupon.type === "percent") {
      subtotal = subtotal * (1 - Number(cart.coupon.value) / 100);
    } else {
      subtotal = Math.max(0, subtotal - Number(cart.coupon.value));
    }
  }

  // Create invoice and order in a transaction
  const result = await db.$transaction(async (tx) => {
    // Create invoice
    const invoice = await tx.invoice.create({
      data: {
        userId,
        currencyCode,
        status: "pending",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        items: {
          create: cart.items.map((item) => {
            const price = item.plan.prices.find(
              (p) => p.currencyCode === currencyCode
            ) ?? item.plan.prices[0];
            return {
              description: `${item.plan.product.name} — ${item.plan.name}`,
              price: price ? Number(price.price) : 0,
              quantity: 1,
            };
          }),
        },
      },
    });

    // Create order
    const order = await tx.order.create({
      data: {
        userId,
        invoiceId: invoice.id,
        currencyCode,
      },
    });

    // Create services for each cart item
    for (const item of cart.items) {
      const expiresAt = new Date();
      if (item.plan.billingUnit === "month") {
        expiresAt.setMonth(expiresAt.getMonth() + item.plan.billingPeriod);
      } else if (item.plan.billingUnit === "year") {
        expiresAt.setFullYear(expiresAt.getFullYear() + item.plan.billingPeriod);
      } else {
        expiresAt.setDate(expiresAt.getDate() + item.plan.billingPeriod);
      }

      await tx.service.create({
        data: {
          userId,
          orderId: order.id,
          productId: item.plan.productId,
          planId: item.plan.id,
          currencyCode,
          status: "active",
          expiresAt,
        },
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
    await tx.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    });

    return { invoiceId: invoice.id, orderId: order.id };
  });

  return NextResponse.json(result, { status: 201 });
}

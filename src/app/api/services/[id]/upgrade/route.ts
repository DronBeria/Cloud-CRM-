import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getFormattedInvoiceNumber } from "@/lib/billing";
import { getBillingSettings } from "@/lib/settings";

const schema = z.object({
  planId: z.string(),
  configs: z.record(z.string()).optional().default({}),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await db.service.findUnique({
    where: { id },
    include: {
      product: { include: { plans: { include: { prices: true } } } },
      plan: { include: { prices: true } },
    },
  });

  if (!service || service.userId !== currentUser!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (service.status !== "active") {
    return NextResponse.json(
      { error: "Only active services can be upgraded" },
      { status: 400 }
    );
  }

  const body = schema.parse(await req.json());

  // Validate the new plan belongs to the same product
  const newPlan = service.product.plans.find((p) => p.id === body.planId);
  if (!newPlan) {
    return NextResponse.json(
      { error: "Plan not found for this product" },
      { status: 404 }
    );
  }

  if (newPlan.id === service.planId) {
    return NextResponse.json(
      { error: "Service is already on this plan" },
      { status: 400 }
    );
  }

  const billing = await getBillingSettings();
  const newPrice = newPlan.prices.find(
    (p) => p.currencyCode === service.currencyCode
  );

  const result = await db.$transaction(async (tx) => {
    // Create upgrade record
    const upgrade = await tx.serviceUpgrade.create({
      data: {
        serviceId: id,
        planId: body.planId,
        productId: service.productId,
        status: "pending",
        configs: body.configs,
      },
    });

    // Create upgrade invoice if there's a price difference
    let invoiceId: string | null = null;
    const oldPrice = service.plan?.prices.find(
      (p) => p.currencyCode === service.currencyCode
    );
    const priceDiff =
      (newPrice ? Number(newPrice.price) : 0) -
      (oldPrice ? Number(oldPrice.price) : 0);

    if (priceDiff > 0) {
      const dueAt = new Date(
        Date.now() + billing.invoiceDueDays * 24 * 60 * 60 * 1000
      );
      const invoice = await tx.invoice.create({
        data: {
          userId: service.userId,
          currencyCode: service.currencyCode,
          status: "pending",
          dueAt,
          items: {
            create: {
              description: `Upgrade: ${service.product.name} to ${newPlan.name}`,
              price: priceDiff,
              quantity: 1,
              serviceId: id,
            },
          },
        },
      });
      const invoiceNumber = await getFormattedInvoiceNumber(invoice.number);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { invoiceNumber },
      });
      invoiceId = invoice.id;
    } else {
      // Free upgrade or downgrade — apply immediately
      await tx.service.update({
        where: { id },
        data: { planId: body.planId, price: newPrice?.price ?? service.price },
      });

      // Update configs
      if (Object.keys(body.configs).length > 0) {
        await tx.serviceConfig.deleteMany({ where: { serviceId: id } });
        await tx.serviceConfig.createMany({
          data: Object.entries(body.configs).map(([configOptionId, value]) => ({
            serviceId: id,
            configOptionId,
            value,
          })),
        });
      }

      await tx.serviceUpgrade.update({
        where: { id: upgrade.id },
        data: { status: "completed" },
      });
    }

    return { upgrade, invoiceId };
  });

  return NextResponse.json(
    {
      success: true,
      upgradeId: result.upgrade.id,
      invoiceId: result.invoiceId,
      requiresPayment: !!result.invoiceId,
    },
    { status: 201 }
  );
}

// GET — list upgrades for a service
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await db.service.findUnique({ where: { id } });
  if (!service || service.userId !== currentUser!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const upgrades = await db.serviceUpgrade.findMany({
    where: { serviceId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(upgrades);
}

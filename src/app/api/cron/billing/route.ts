import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Protected by CRON_SECRET environment variable
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { suspended: 0, cancelled: 0, renewals: 0 };

  // 1. Suspend active services with overdue invoices
  const overdueInvoices = await db.invoice.findMany({
    where: { status: "pending", dueAt: { lt: now } },
    include: {
      orders: { include: { services: { where: { status: "active" } } } },
    },
  });

  for (const invoice of overdueInvoices) {
    for (const order of invoice.orders) {
      for (const service of order.services) {
        await db.service.update({
          where: { id: service.id },
          data: { status: "suspended" },
        });
        await db.notification.create({
          data: {
            userId: service.userId,
            title: "Service Suspended",
            body: "Your service has been suspended due to an overdue invoice.",
            url: `/invoices/${invoice.id}`,
          },
        });
        results.suspended++;
      }
    }
  }

  // 2. Cancel services suspended for 14+ days
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const longSuspended = await db.service.findMany({
    where: { status: "suspended", updatedAt: { lt: twoWeeksAgo } },
  });

  for (const service of longSuspended) {
    await db.service.update({ where: { id: service.id }, data: { status: "cancelled" } });
    results.cancelled++;
  }

  // 3. Generate renewal invoices for services expiring within 7 days
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringServices = await db.service.findMany({
    where: { status: "active", expiresAt: { gte: now, lte: sevenDaysFromNow } },
    include: { plan: { include: { prices: true } }, product: true },
  });

  for (const service of expiringServices) {
    const existingInvoice = await db.invoice.findFirst({
      where: {
        userId: service.userId,
        status: "pending",
        items: { some: { description: { contains: service.product.name } } },
      },
    });
    if (existingInvoice) continue;

    const price = service.plan?.prices.find(
      (p) => p.currencyCode === service.currencyCode
    );
    if (!price) continue;

    await db.invoice.create({
      data: {
        userId: service.userId,
        currencyCode: service.currencyCode,
        status: "pending",
        dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        items: {
          create: {
            description: `${service.product.name} — ${service.plan?.name} Renewal`,
            price: price.price,
            quantity: 1,
          },
        },
      },
    });
    results.renewals++;
  }

  console.log("[Billing Cron]", results);
  return NextResponse.json({ success: true, ...results });
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ ok: true });
}

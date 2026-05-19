import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBillingSettings } from "@/lib/settings";
import { getFormattedInvoiceNumber } from "@/lib/billing";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const billing = await getBillingSettings();
  const results = {
    suspended: 0,
    cancelled: 0,
    renewals: 0,
    reminders: 0,
    ticketsClosed: 0,
  };

  // 1. Suspend active services with overdue invoices (past due by suspendDays)
  const suspendCutoff = new Date(
    now.getTime() - billing.suspendDays * 24 * 60 * 60 * 1000
  );
  const overdueInvoices = await db.invoice.findMany({
    where: { status: "pending", dueAt: { lt: suspendCutoff } },
    include: {
      orders: {
        include: { services: { where: { status: "active" } } },
      },
    },
  });

  for (const invoice of overdueInvoices) {
    for (const order of invoice.orders) {
      for (const service of order.services) {
        await db.service.update({
          where: { id: service.id },
          data: { status: "suspended", suspendedAt: now },
        });
        await sendNotification("service_suspended", service.userId, {
          serviceName: service.label ?? service.id,
          invoiceUrl: `/invoices/${invoice.id}`,
        }).catch(console.error);
        results.suspended++;
      }
    }
  }

  // 2. Cancel services suspended for longer than terminateDays
  const terminateCutoff = new Date(
    now.getTime() - billing.terminateDays * 24 * 60 * 60 * 1000
  );
  const longSuspended = await db.service.findMany({
    where: { status: "suspended", suspendedAt: { lt: terminateCutoff } },
    include: { product: true },
  });

  for (const service of longSuspended) {
    await db.service.update({
      where: { id: service.id },
      data: { status: "cancelled" },
    });
    // Cancel any pending invoices linked to this service via order
    if (service.orderId) {
      const order = await db.order.findUnique({
        where: { id: service.orderId },
        include: { invoice: true },
      });
      if (order?.invoice && order.invoice.status === "pending") {
        await db.invoice.update({
          where: { id: order.invoice.id },
          data: { status: "cancelled" },
        });
      }
    }
    results.cancelled++;
  }

  // 3. Generate renewal invoices for services expiring within renewalDays
  const renewalCutoff = new Date(
    now.getTime() + billing.renewalDays * 24 * 60 * 60 * 1000
  );
  const expiringServices = await db.service.findMany({
    where: {
      status: "active",
      expiresAt: { gte: now, lte: renewalCutoff },
    },
    include: {
      plan: { include: { prices: true } },
      product: true,
    },
  });

  for (const service of expiringServices) {
    if (!service.planId || !service.plan) continue;

    // Skip one-time plans
    if (service.plan.isOneTime) continue;

    // Check if renewal invoice already exists
    const existing = await db.invoice.findFirst({
      where: {
        userId: service.userId,
        status: "pending",
        items: {
          some: {
            serviceId: service.id,
            description: { contains: "Renewal" },
          },
        },
      },
    });
    if (existing) continue;

    const price = service.plan.prices.find(
      (p) => p.currencyCode === service.currencyCode
    );
    if (!price) continue;

    const dueAt = service.expiresAt ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const invoice = await db.invoice.create({
      data: {
        userId: service.userId,
        currencyCode: service.currencyCode,
        status: "pending",
        dueAt,
        items: {
          create: {
            description: `${service.product.name} — ${service.plan.name} Renewal`,
            price: price.price,
            quantity: 1,
            serviceId: service.id,
          },
        },
      },
    });

    const invoiceNumber = await getFormattedInvoiceNumber(invoice.number);
    await db.invoice.update({
      where: { id: invoice.id },
      data: { invoiceNumber },
    });

    // Send renewal reminder notification
    const daysUntil = Math.ceil(
      (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    await sendNotification("renewal_reminder", service.userId, {
      serviceName: service.label ?? service.product.name,
      daysUntilRenewal: String(daysUntil),
      renewalDate: dueAt.toLocaleDateString(),
      invoiceUrl: `/invoices/${invoice.id}`,
      invoiceNumber,
    }).catch(console.error);

    results.renewals++;
  }

  // 4. Auto-close tickets with no reply for 7+ days
  const ticketCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const staleTickets = await db.ticket.updateMany({
    where: {
      status: "open",
      lastReplyAt: { lt: ticketCutoff },
    },
    data: { status: "closed" },
  });
  results.ticketsClosed = staleTickets.count;

  console.log("[Billing Cron]", results);
  return NextResponse.json({ success: true, ...results });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "billing-cron" });
}

/**
 * Billing Cron Job
 * Run daily to:
 * 1. Suspend services with unpaid invoices past due date
 * 2. Cancel services that have been suspended for 14+ days
 * 3. Generate renewal invoices for services expiring within 7 days
 */

import { db } from "./db";

async function runBillingCycle() {
  console.log("[Billing Cron] Starting billing cycle...", new Date().toISOString());

  const now = new Date();

  // 1. Suspend active services with overdue invoices
  const overdueInvoices = await db.invoice.findMany({
    where: {
      status: "pending",
      dueAt: { lt: now },
    },
    include: {
      orders: {
        include: {
          services: {
            where: { status: "active" },
          },
        },
      },
    },
  });

  let suspended = 0;
  for (const invoice of overdueInvoices) {
    for (const order of invoice.orders) {
      for (const service of order.services) {
        await db.service.update({
          where: { id: service.id },
          data: { status: "suspended" },
        });
        suspended++;

        // Create in-app notification
        await db.notification.create({
          data: {
            userId: service.userId,
            title: "Service Suspended",
            body: `Your service has been suspended due to an overdue invoice.`,
            url: `/invoices/${invoice.id}`,
          },
        });
      }
    }
  }

  console.log(`[Billing Cron] Suspended ${suspended} services`);

  // 2. Cancel services suspended for 14+ days
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const longSuspended = await db.service.findMany({
    where: {
      status: "suspended",
      updatedAt: { lt: twoWeeksAgo },
    },
  });

  for (const service of longSuspended) {
    await db.service.update({
      where: { id: service.id },
      data: { status: "cancelled" },
    });
  }

  console.log(`[Billing Cron] Cancelled ${longSuspended.length} long-suspended services`);

  // 3. Generate renewal invoices for services expiring within 7 days
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringServices = await db.service.findMany({
    where: {
      status: "active",
      expiresAt: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
    include: {
      plan: {
        include: {
          prices: true,
        },
      },
      product: true,
    },
  });

  let renewals = 0;
  for (const service of expiringServices) {
    // Check if renewal invoice already exists
    const existingInvoice = await db.invoice.findFirst({
      where: {
        userId: service.userId,
        status: "pending",
        items: {
          some: {
            description: {
              contains: service.product.name,
            },
          },
        },
      },
    });

    if (existingInvoice) continue;

    const price = service.plan?.prices.find(
      (p) => p.currencyCode === service.currencyCode
    );
    if (!price) continue;

    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.invoice.create({
      data: {
        userId: service.userId,
        currencyCode: service.currencyCode,
        status: "pending",
        dueAt: dueDate,
        items: {
          create: {
            description: `${service.product.name} — ${service.plan?.name} Renewal`,
            price: price.price,
            quantity: 1,
          },
        },
      },
    });

    renewals++;
  }

  console.log(`[Billing Cron] Created ${renewals} renewal invoices`);
  console.log("[Billing Cron] Billing cycle complete.");
}

runBillingCycle().catch(console.error);

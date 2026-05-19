import { inngest } from "./client";
import { db } from "@/lib/db";
import { getBillingSettings } from "@/lib/settings";
import { getFormattedInvoiceNumber } from "@/lib/billing";
import { sendNotification } from "@/lib/notifications";
import { suspendService as tsplusSuspend, isTsplusProduct, isConfigured as tsplusConfigured } from "@/lib/tsplus";
import { subDays } from "date-fns";

// Daily billing cron — replaces the manual /api/cron/billing endpoint
export const dailyBilling = inngest.createFunction(
  {
    id: "daily-billing",
    name: "Daily Billing & Renewals",
    retries: 3,
  },
  { cron: "0 0 * * *" }, // midnight UTC daily
  async ({ step }) => {
    const billing = await getBillingSettings();
    const now = new Date();

    // Step 1: Suspend overdue services
    const suspended = await step.run("suspend-overdue", async () => {
      const suspendCutoff = subDays(now, billing.suspendDays);
      const overdueInvoices = await db.invoice.findMany({
        where: { status: "pending", dueAt: { lt: suspendCutoff } },
        include: { orders: { include: { services: { where: { status: "active" } } } } },
      });

      let count = 0;
      for (const invoice of overdueInvoices) {
        for (const order of invoice.orders) {
          for (const service of order.services) {
            await db.service.update({
              where: { id: service.id },
              data: { status: "suspended", suspendedAt: now },
            });
            if (tsplusConfigured()) {
              try {
                const product = await db.product.findUnique({ where: { id: service.productId } });
                if (product && isTsplusProduct(product.slug)) await tsplusSuspend(service.id);
              } catch { /* non-fatal */ }
            }
            await sendNotification("service_suspended", service.userId, {
              serviceName: service.label ?? service.id,
              invoiceUrl: `/invoices/${invoice.id}`,
            }).catch(console.error);
            count++;
          }
        }
      }
      return { suspended: count };
    });

    // Step 2: Cancel long-suspended services
    const cancelled = await step.run("cancel-terminated", async () => {
      const terminateCutoff = subDays(now, billing.terminateDays);
      const longSuspended = await db.service.findMany({
        where: { status: "suspended", suspendedAt: { lt: terminateCutoff } },
      });
      for (const s of longSuspended) {
        await db.service.update({ where: { id: s.id }, data: { status: "cancelled" } });
      }
      return { cancelled: longSuspended.length };
    });

    // Step 3: Generate renewal invoices
    const renewals = await step.run("generate-renewals", async () => {
      const renewalCutoff = subDays(now, -billing.renewalDays);
      const expiring = await db.service.findMany({
        where: { status: "active", expiresAt: { gte: now, lte: renewalCutoff }, planId: { not: null } },
        include: { plan: { include: { prices: true } }, product: true },
      });

      let count = 0;
      for (const s of expiring) {
        if (!s.plan || s.plan.isOneTime) continue;
        const existing = await db.invoice.findFirst({
          where: { userId: s.userId, status: "pending", items: { some: { serviceId: s.id, description: { contains: "Renewal" } } } },
        });
        if (existing) continue;
        const price = s.plan.prices.find((p) => p.currencyCode === s.currencyCode);
        if (!price) continue;

        const dueAt = s.expiresAt ?? subDays(now, -7);
        const invoice = await db.invoice.create({
          data: {
            userId: s.userId,
            currencyCode: s.currencyCode,
            status: "pending",
            dueAt,
            items: { create: { description: `${s.product.name} — ${s.plan.name} Renewal`, price: price.price, quantity: 1, serviceId: s.id } },
          },
        });
        const invoiceNumber = await getFormattedInvoiceNumber(invoice.number);
        await db.invoice.update({ where: { id: invoice.id }, data: { invoiceNumber } });
        await sendNotification("renewal_reminder", s.userId, {
          serviceName: s.label ?? s.product.name,
          daysUntilRenewal: String(Math.ceil((dueAt.getTime() - now.getTime()) / 86400000)),
          renewalDate: dueAt.toLocaleDateString("en-IN"),
          invoiceUrl: `/invoices/${invoice.id}`,
          invoiceNumber,
        }).catch(console.error);
        count++;
      }
      return { renewals: count };
    });

    // Step 4: Auto-close stale tickets
    const closed = await step.run("close-stale-tickets", async () => {
      const staleCutoff = subDays(now, 7);
      const result = await db.ticket.updateMany({
        where: { status: "open", lastReplyAt: { lt: staleCutoff } },
        data: { status: "closed" },
      });
      return { ticketsClosed: result.count };
    });

    return { ...suspended, ...cancelled, ...renewals, ...closed, runAt: now.toISOString() };
  }
);

// Triggered when an invoice is paid — provision services
export const onInvoicePaid = inngest.createFunction(
  { id: "on-invoice-paid", name: "Handle Invoice Paid", retries: 3 },
  { event: "invoice/paid" },
  async ({ event, step }) => {
    const { invoiceId } = event.data as { invoiceId: string };
    const { processInvoicePaid } = await import("@/lib/billing");
    await step.run("process-payment", () => processInvoicePaid(invoiceId));
  }
);

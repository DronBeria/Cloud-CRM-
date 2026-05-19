import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { sendNotification } from "@/lib/notifications";

export function formatInvoiceNumber(
  number: number,
  prefix = "INV",
  padding = 4
): string {
  return `${prefix}-${String(number).padStart(padding, "0")}`;
}

export async function getFormattedInvoiceNumber(number: number): Promise<string> {
  const prefix = (await getSetting("invoice_prefix")) ?? "INV";
  const padding = parseInt((await getSetting("invoice_padding")) ?? "4");
  return formatInvoiceNumber(number, prefix, isNaN(padding) ? 4 : padding);
}

// Called whenever an invoice transitions to "paid"
export async function processInvoicePaid(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      user: true,
      items: true,
      currency: true,
      orders: { include: { services: { include: { plan: true } } } },
    },
  });

  if (!invoice) return;

  // 1. Stamp paidAt
  await db.invoice.update({
    where: { id: invoiceId },
    data: { paidAt: new Date() },
  });

  // 2. Create invoice snapshot (freeze user billing data)
  const existing = await db.invoiceSnapshot.findUnique({ where: { invoiceId } });
  if (!existing) {
    await db.invoiceSnapshot.create({
      data: {
        invoiceId,
        data: {
          userName: invoice.user.name,
          userEmail: invoice.user.email,
          userAddress: invoice.user.address,
          userCity: invoice.user.city,
          userState: invoice.user.state,
          userCountry: invoice.user.country,
          userPostcode: invoice.user.postcode,
          userCompanyName: invoice.user.companyName,
          total: invoice.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0),
          currencyCode: invoice.currencyCode,
          paidAt: new Date().toISOString(),
        },
      },
    });
  }

  // 3. Activate pending services on this invoice's orders
  for (const order of invoice.orders) {
    await db.order.update({ where: { id: order.id }, data: { status: "active" } });

    for (const service of order.services) {
      if (service.status === "pending" || service.status === "suspended") {
        const now = new Date();
        const expiresAt = calculateNextExpiry(now, service.plan);

        await db.service.update({
          where: { id: service.id },
          data: {
            status: "active",
            expiresAt,
            suspendedAt: null,
          },
        });
      }
    }
  }

  // 4. Send paid notification
  await sendNotification("invoice_paid", invoice.userId, {
    invoiceNumber: invoice.invoiceNumber ?? `#${invoice.number}`,
    amount: invoice.items
      .reduce((s, i) => s + Number(i.price) * i.quantity, 0)
      .toFixed(2),
    currency: invoice.currency.code,
    invoiceUrl: `/invoices/${invoice.id}`,
  });
}

function calculateNextExpiry(
  from: Date,
  plan: { billingPeriod: number; billingUnit: string; isOneTime: boolean } | null
): Date | null {
  if (!plan || plan.isOneTime) return null;
  const d = new Date(from);
  if (plan.billingUnit === "month") d.setMonth(d.getMonth() + plan.billingPeriod);
  else if (plan.billingUnit === "year") d.setFullYear(d.getFullYear() + plan.billingPeriod);
  else if (plan.billingUnit === "day") d.setDate(d.getDate() + plan.billingPeriod);
  else if (plan.billingUnit === "week") d.setDate(d.getDate() + plan.billingPeriod * 7);
  return d;
}

// Called from checkout to calculate expiry for a new service
export function calculateServiceExpiry(
  plan: { billingPeriod: number; billingUnit: string; isOneTime: boolean } | null
): Date | null {
  return calculateNextExpiry(new Date(), plan);
}

// Get user's total credit balance for a currency
export async function getUserCreditBalance(
  userId: string,
  currencyCode: string
): Promise<number> {
  const credits = await db.credit.findMany({
    where: { userId, currencyCode },
  });
  return credits.reduce((s, c) => s + Number(c.amount), 0);
}

// Deduct credits and return the remaining amount to pay
export async function applyCredits(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  invoiceId: string,
  userId: string,
  currencyCode: string,
  total: number
): Promise<number> {
  const credits = await tx.credit.findMany({ where: { userId, currencyCode } });
  const balance = credits.reduce((s, c) => s + Number(c.amount), 0);
  if (balance <= 0) return total;

  const applied = Math.min(balance, total);
  const remaining = total - applied;

  // Delete all credits for this currency
  await tx.credit.deleteMany({ where: { userId, currencyCode } });

  // Record the credit transaction
  await tx.invoiceTransaction.create({
    data: {
      invoiceId,
      userId,
      amount: applied,
      status: "succeeded",
      isCreditTransaction: true,
    },
  });

  // Refund excess credits
  if (balance > total) {
    await tx.credit.create({
      data: {
        userId,
        currencyCode,
        amount: balance - total,
        description: `Refund from invoice payment`,
      },
    });
  }

  return remaining;
}

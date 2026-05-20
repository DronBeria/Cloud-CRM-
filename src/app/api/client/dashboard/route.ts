import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Single endpoint — all dashboard data in one fast DB call
export async function GET() {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = currentUser.id;

  try {
    const inrRateSetting = await db.setting.findFirst({
      where: { key: "inr_exchange_rate" },
      select: { value: true },
    }).catch(() => null);
    const inrRate = parseFloat(inrRateSetting?.value ?? "83.5");

    const [services, invoices, tickets, credits, notifications, trialInfo] = await Promise.all([
      db.service.findMany({
        where: { userId, status: { not: "cancelled" } },
        include: { product: true, plan: true, currency: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      db.invoice.findMany({
        where: { userId, status: { in: ["pending", "paid"] } },
        include: { currency: true, items: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.ticket.findMany({
        where: { userId, status: { not: "closed" } },
        orderBy: { updatedAt: "desc" },
        take: 4,
      }),
      db.credit.findMany({ where: { userId } }),
      db.notification.findMany({
        where: { userId, readAt: null },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      // Trial eligibility
      Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { trialClaimedAt: true } }),
        db.setting.findFirst({ where: { key: "trial_plan_id" }, select: { value: true } }),
        db.setting.findFirst({ where: { key: "trial_duration_days" }, select: { value: true } }),
      ]).then(async ([user, planSetting, daysSetting]) => {
        if (user?.trialClaimedAt || !planSetting?.value) return null;
        const plan = await db.plan.findUnique({
          where: { id: planSetting.value },
          include: { product: { select: { name: true } } },
        }).catch(() => null);
        return plan ? { planName: plan.product.name, days: parseInt(daysSetting?.value ?? "7") } : null;
      }),
    ]);

    // Calculate INR totals
    const toInr = (amount: number, currencyCode: string, rate: number) =>
      currencyCode === "INR" ? amount : amount * rate;

    const pendingInvoices = invoices.filter((i) => i.status === "pending");
    const totalDue = pendingInvoices.reduce((sum, inv) => {
      const t = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      return sum + toInr(t, inv.currency.code, inrRate / Number(inv.currency.exchangeRate));
    }, 0);

    const now = new Date();

    return NextResponse.json({
      user: { id: currentUser.id, name: currentUser.name, email: currentUser.email },
      stats: {
        activeServices: services.filter((s) => s.status === "active").length,
        pendingInvoices: pendingInvoices.length,
        openTickets: tickets.length,
        creditBalance: credits.reduce((s, c) => s + Number(c.amount), 0),
        totalDue: Math.round(totalDue),
        unreadNotifications: notifications.length,
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.label ?? s.product.name,
        productSlug: s.product.slug,
        planName: s.plan?.name,
        billingUnit: s.plan?.billingUnit,
        status: s.status,
        priceInr: Math.round(toInr(Number(s.price), s.currency.code, inrRate / Number(s.currency.exchangeRate))),
        expiresAt: s.expiresAt,
        daysLeft: s.expiresAt ? Math.ceil((new Date(s.expiresAt).getTime() - now.getTime()) / 86400000) : null,
        isTrial: s.isTrial,
        metadata: s.metadata,
      })),
      invoices: invoices.map((inv) => {
        const total = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber ?? `#${inv.number}`,
          number: inv.number,
          status: inv.status,
          totalInr: Math.round(toInr(total, inv.currency.code, inrRate / Number(inv.currency.exchangeRate))),
          createdAt: inv.createdAt,
          dueAt: inv.dueAt,
        };
      }),
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        updatedAt: t.updatedAt,
      })),
      trial: trialInfo,
    });
  } catch (e) {
    console.error("[Dashboard API]", e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}

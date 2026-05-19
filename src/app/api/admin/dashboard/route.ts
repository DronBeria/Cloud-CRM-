import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

async function getInrRate(): Promise<number> {
  const setting = await db.setting.findFirst({ where: { key: "inr_exchange_rate" } });
  return parseFloat(setting?.value ?? "83.5");
}

async function toInr(amount: number, currencyCode: string, inrRate: number): Promise<number> {
  if (currencyCode === "INR") return amount;
  const currency = await db.currency.findUnique({ where: { code: currencyCode } });
  const toUsd = amount / Number(currency?.exchangeRate ?? 1);
  return toUsd * inrRate;
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30d";
  const inrRate = await getInrRate();
  const now = new Date();

  // Date range calculation
  let startDate: Date;
  let groupBy: "day" | "week" | "month";

  switch (range) {
    case "7d":  startDate = subDays(now, 7);   groupBy = "day";   break;
    case "30d": startDate = subDays(now, 30);  groupBy = "day";   break;
    case "90d": startDate = subDays(now, 90);  groupBy = "week";  break;
    case "week": startDate = startOfWeek(now); groupBy = "day";   break;
    case "month": startDate = startOfMonth(now); groupBy = "day"; break;
    case "year": startDate = subMonths(now, 12); groupBy = "month"; break;
    default:    startDate = subDays(now, 30);  groupBy = "day";
  }

  const clientRole = await db.role.findFirst({ where: { name: "user" } });
  const startOfThisMonth = startOfMonth(now);
  const startOfLastMonth = startOfMonth(subMonths(now, 1));
  const endOfLastMonth = endOfMonth(subMonths(now, 1));

  // Parallel data fetch
  const [
    activeServices,
    allTransactions,
    newClientsThisMonth,
    newClientsLastMonth,
    openTickets,
    pendingInvoices,
    upcomingRenewals,
    pendingLeads,
    recentActivity,
  ] = await Promise.all([
    db.service.findMany({
      where: { status: "active" },
      include: { plan: true, currency: true, product: true, user: { select: { name: true, email: true } } },
    }),
    db.invoiceTransaction.findMany({
      where: { status: "succeeded", createdAt: { gte: startDate } },
      include: { invoice: { include: { currency: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.user.count({ where: { roleId: clientRole?.id, createdAt: { gte: startOfThisMonth } } }),
    db.user.count({ where: { roleId: clientRole?.id, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    db.ticket.count({ where: { status: { in: ["open", "replied"] } } }),
    db.invoice.count({ where: { status: "pending" } }),
    db.service.findMany({
      where: {
        status: "active",
        expiresAt: { gte: now, lte: subDays(now, -30) },
        plan: { isOneTime: false },
      },
      include: {
        user: { select: { name: true, email: true } },
        product: true,
        plan: { include: { prices: true } },
        currency: true,
      },
      orderBy: { expiresAt: "asc" },
      take: 20,
    }),
    db.lead.count({ where: { status: { in: ["new", "contacted", "qualified"] } } }),
    // Activity: merge recent events from multiple tables
    Promise.all([
      db.user.findMany({ where: { roleId: clientRole?.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true } }),
      db.invoiceTransaction.findMany({ where: { status: "succeeded" }, orderBy: { createdAt: "desc" }, take: 5, include: { invoice: { include: { user: { select: { name: true } }, currency: true } } } }),
      db.ticket.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } }),
      db.service.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } }, product: true } }),
      db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, source: true, status: true, createdAt: true } }),
    ]),
  ]);

  // MRR calculation (convert all to INR)
  let mrr = 0;
  for (const service of activeServices) {
    if (!service.plan) continue;
    const price = Number(service.price);
    if (price <= 0) continue;
    let monthlyPrice = price;
    if (service.plan.billingUnit === "year") monthlyPrice = price / 12;
    else if (service.plan.billingUnit === "day") monthlyPrice = price * 30;
    else if (service.plan.billingUnit === "week") monthlyPrice = price * 4.33;
    if (service.currency.code !== "INR") {
      monthlyPrice = (monthlyPrice / Number(service.currency.exchangeRate)) * inrRate;
    }
    mrr += monthlyPrice;
  }
  const arr = mrr * 12;

  // Revenue chart data
  const intervals = groupBy === "day"
    ? eachDayOfInterval({ start: startDate, end: now })
    : groupBy === "week"
    ? eachWeekOfInterval({ start: startDate, end: now })
    : eachMonthOfInterval({ start: startDate, end: now });

  const chartData = await Promise.all(intervals.map(async (date) => {
    const start = groupBy === "day" ? startOfDay(date) : groupBy === "week" ? startOfWeek(date) : startOfMonth(date);
    const end = groupBy === "day" ? endOfDay(date) : groupBy === "week" ? endOfWeek(date) : endOfMonth(date);

    const periodTxns = allTransactions.filter(
      (t) => new Date(t.createdAt) >= start && new Date(t.createdAt) <= end
    );

    let revenue = 0;
    for (const t of periodTxns) {
      const amtInr = t.invoice?.currency
        ? (Number(t.amount) / Number(t.invoice.currency.exchangeRate)) * inrRate
        : Number(t.amount) * inrRate;
      revenue += amtInr;
    }

    return {
      date: format(date, groupBy === "day" ? "MMM d" : groupBy === "week" ? "MMM d" : "MMM yyyy"),
      revenue: Math.round(revenue),
    };
  }));

  // Total revenue in range
  let totalRevenue = 0;
  for (const t of allTransactions) {
    const amtInr = t.invoice?.currency
      ? (Number(t.amount) / Number(t.invoice.currency.exchangeRate)) * inrRate
      : Number(t.amount) * inrRate;
    totalRevenue += amtInr;
  }

  // Upcoming renewals with INR amounts
  const renewals = await Promise.all(
    upcomingRenewals.map(async (s) => {
      const price = Number(s.price);
      const priceInr = s.currency.code === "INR"
        ? price
        : (price / Number(s.currency.exchangeRate)) * inrRate;
      const daysLeft = Math.ceil((new Date(s.expiresAt!).getTime() - now.getTime()) / 86400000);
      return {
        id: s.id,
        clientName: s.user.name,
        clientEmail: s.user.email,
        serviceName: s.product.name,
        planName: s.plan?.name ?? "",
        amount: Math.round(priceInr),
        daysLeft,
        expiresAt: s.expiresAt,
        hasInvoice: false,
      };
    })
  );

  // Build activity feed
  const [recentClients, recentPayments, recentTickets, recentServices, recentLeads] = recentActivity;

  const activity = [
    ...recentClients.map((c) => ({ type: "client_joined", title: `${c.name} joined`, subtitle: c.email, time: c.createdAt, id: c.id })),
    ...recentPayments.map((t) => {
      const amtInr = t.invoice?.currency ? Math.round((Number(t.amount) / Number(t.invoice.currency.exchangeRate)) * inrRate) : Math.round(Number(t.amount) * inrRate);
      return { type: "payment_received", title: `Payment received`, subtitle: `₹${amtInr.toLocaleString("en-IN")} from ${t.invoice?.user?.name ?? "unknown"}`, time: t.createdAt, id: t.id };
    }),
    ...recentTickets.map((t) => ({ type: "ticket_opened", title: `Ticket opened`, subtitle: `${t.subject} by ${t.user.name}`, time: t.createdAt, id: t.id })),
    ...recentServices.map((s) => ({ type: "service_created", title: `Service activated`, subtitle: `${s.product.name} for ${s.user.name}`, time: s.createdAt, id: s.id })),
    ...recentLeads.map((l) => ({ type: "lead_created", title: `New lead`, subtitle: `${l.name} via ${l.source}`, time: l.createdAt, id: l.id })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 20);

  const clientGrowth = newClientsLastMonth > 0
    ? Math.round(((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100)
    : newClientsThisMonth > 0 ? 100 : 0;

  return NextResponse.json({
    stats: {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      newClientsThisMonth,
      newClientsLastMonth,
      clientGrowth,
      openTickets,
      pendingInvoices,
      pendingLeads,
      totalRevenue: Math.round(totalRevenue),
      activeServicesCount: activeServices.length,
    },
    chartData,
    renewals,
    activity,
  });
}

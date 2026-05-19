import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { subDays, subMonths, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { ActivityFeed } from "@/components/admin/dashboard/ActivityFeed";
import { RenewalsList } from "@/components/admin/dashboard/RenewalsList";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import {
  TrendingUp, TrendingDown, Users, Server, MessageSquare,
  Clock, AlertCircle, UserPlus, IndianRupee, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard — Admin" };

async function getInrRate(): Promise<number> {
  try {
    const s = await db.setting.findFirst({ where: { key: "inr_exchange_rate" } });
    return parseFloat(s?.value ?? "83.5");
  } catch { return 83.5; }
}

async function toInr(amount: number, currencyCode: string, inrRate: number): Promise<number> {
  if (currencyCode === "INR") return amount;
  try {
    const c = await db.currency.findUnique({ where: { code: currencyCode } });
    return (amount / Number(c?.exchangeRate ?? 1)) * inrRate;
  } catch { return amount * inrRate; }
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isStaff(role)) redirect("/admin/login");

  const inrRate = await getInrRate();
  const now = new Date();
  const startOf30d = subDays(now, 30);
  const startOfThisMonth = startOfMonth(now);
  const startOfLastMonth = startOfMonth(subMonths(now, 1));

  const clientRole = await db.role.findFirst({ where: { name: "user" } });

  // Parallel data fetch
  const [
    activeServices,
    revenue30d,
    newClientsThisMonth,
    newClientsLastMonth,
    openTickets,
    pendingInvoicesCount,
    pendingLeads,
    upcomingRenewals,
    recentClients,
    recentPayments,
    recentTickets,
    recentServicesList,
    recentLeads,
  ] = await Promise.all([
    db.service.findMany({
      where: { status: "active" },
      include: { plan: true, currency: true },
    }),
    db.invoiceTransaction.findMany({
      where: { status: "succeeded", createdAt: { gte: startOf30d } },
      include: { invoice: { include: { currency: true } } },
    }),
    db.user.count({ where: { roleId: clientRole?.id, createdAt: { gte: startOfThisMonth } } }),
    db.user.count({ where: { roleId: clientRole?.id, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
    db.ticket.count({ where: { status: { in: ["open", "replied"] } } }),
    db.invoice.count({ where: { status: "pending" } }),
    db.lead.count({ where: { status: { in: ["new", "contacted", "qualified"] } } }),
    db.service.findMany({
      where: { status: "active", expiresAt: { gte: now, lte: subDays(now, -30) }, planId: { not: null } },
      include: { user: { select: { name: true, email: true } }, product: true, plan: { include: { prices: true } }, currency: true },
      orderBy: { expiresAt: "asc" },
      take: 15,
    }),
    db.user.findMany({ where: { roleId: clientRole?.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true } }),
    db.invoiceTransaction.findMany({ where: { status: "succeeded" }, orderBy: { createdAt: "desc" }, take: 5, include: { invoice: { include: { user: { select: { name: true } }, currency: true } } } }),
    db.ticket.findMany({ orderBy: { createdAt: "desc" }, take: 4, include: { user: { select: { name: true } } } }),
    db.service.findMany({ orderBy: { createdAt: "desc" }, take: 4, include: { user: { select: { name: true } }, product: true } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 4, select: { id: true, name: true, email: true, source: true, status: true, createdAt: true } }),
  ]);

  // MRR calculation
  let mrr = 0;
  for (const s of activeServices) {
    if (!s.plan) continue;
    let price = Number(s.price);
    if (price <= 0) continue;
    if (s.plan.billingUnit === "year") price /= 12;
    else if (s.plan.billingUnit === "day") price *= 30;
    else if (s.plan.billingUnit === "week") price *= 4.33;
    if (s.currency.code !== "INR") price = (price / Number(s.currency.exchangeRate)) * inrRate;
    mrr += price;
  }
  const arr = mrr * 12;

  // Revenue this period in INR
  let revenue = 0;
  for (const t of revenue30d) {
    const c = t.invoice?.currency;
    revenue += c ? (Number(t.amount) / Number(c.exchangeRate)) * inrRate : Number(t.amount) * inrRate;
  }

  // Client growth
  const clientGrowth = newClientsLastMonth > 0
    ? Math.round(((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100)
    : newClientsThisMonth > 0 ? 100 : 0;

  // Renewals
  const renewals = upcomingRenewals.map((s) => {
    const price = Number(s.price);
    const priceInr = s.currency.code === "INR" ? price : (price / Number(s.currency.exchangeRate)) * inrRate;
    const daysLeft = Math.ceil((new Date(s.expiresAt!).getTime() - now.getTime()) / 86400000);
    return { id: s.id, clientName: s.user.name, clientEmail: s.user.email, serviceName: s.product.name, planName: s.plan?.name ?? "", amount: Math.round(priceInr), daysLeft, expiresAt: s.expiresAt!.toISOString(), hasInvoice: false };
  });

  // Activity feed
  const activity = [
    ...recentClients.map((c) => ({ type: "client_joined" as const, title: "New client joined", subtitle: `${c.name} · ${c.email}`, time: c.createdAt.toISOString(), id: c.id })),
    ...recentPayments.map((t) => {
      const amtInr = t.invoice?.currency ? Math.round((Number(t.amount) / Number(t.invoice.currency.exchangeRate)) * inrRate) : Math.round(Number(t.amount) * inrRate);
      return { type: "payment_received" as const, title: "Payment received", subtitle: `₹${amtInr.toLocaleString("en-IN")} from ${t.invoice?.user?.name ?? "client"}`, time: t.createdAt.toISOString(), id: t.id };
    }),
    ...recentTickets.map((t) => ({ type: "ticket_opened" as const, title: "Support ticket", subtitle: `${t.subject} — ${t.user.name}`, time: t.createdAt.toISOString(), id: t.id })),
    ...recentServicesList.map((s) => ({ type: "service_created" as const, title: "Service activated", subtitle: `${s.product.name} for ${s.user.name}`, time: s.createdAt.toISOString(), id: s.id })),
    ...recentLeads.map((l) => ({ type: "lead_created" as const, title: "New lead", subtitle: `${l.name} via ${l.source}`, time: l.createdAt.toISOString(), id: l.id })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 18);

  const statCards = [
    {
      label: "MRR",
      value: `₹${Math.round(mrr).toLocaleString("en-IN")}`,
      sub: `ARR ₹${Math.round(arr / 1000).toLocaleString("en-IN")}K`,
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/admin/invoices",
    },
    {
      label: "Revenue (30d)",
      value: `₹${Math.round(revenue).toLocaleString("en-IN")}`,
      sub: "Collected this month",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/admin/invoices",
    },
    {
      label: "New Clients",
      value: newClientsThisMonth,
      sub: clientGrowth >= 0 ? `+${clientGrowth}% vs last month` : `${clientGrowth}% vs last month`,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      trend: clientGrowth,
      href: "/admin/clients",
    },
    {
      label: "Active Services",
      value: activeServices.length,
      sub: `${pendingInvoicesCount} pending invoices`,
      icon: Server,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/admin/services",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()},{" "}
            <span className="text-orange-500">{session.user?.name?.split(" ")[0] ?? "Admin"}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Pending lead alert */}
      {pendingLeads > 0 && (
        <Link href="/admin/clients?tab=leads">
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 shrink-0">
              <UserPlus className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">
                {pendingLeads} {pendingLeads === 1 ? "lead is" : "leads are"} waiting to be accepted
              </p>
              <p className="text-xs text-orange-500">Click to review and convert them to clients →</p>
            </div>
            <Badge className="bg-orange-500 text-white border-0 text-xs">{pendingLeads} new</Badge>
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.label}</p>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{s.value}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {s.trend !== undefined && (
                      s.trend >= 0
                        ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                        : <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <p className={`text-xs ${s.trend !== undefined && s.trend < 0 ? "text-red-400" : "text-gray-400"}`}>{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Revenue chart + secondary stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-gray-100">
          <CardContent className="p-6">
            <RevenueChart initialRange="30d" />
          </CardContent>
        </Card>

        {/* Quick stats column */}
        <div className="space-y-4">
          <Card className="border-gray-100">
            <CardContent className="p-5 space-y-4">
              {[
                { label: "Open Tickets", value: openTickets, icon: MessageSquare, color: "text-yellow-500", bg: "bg-yellow-50", href: "/admin/tickets" },
                { label: "Pending Invoices", value: pendingInvoicesCount, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", href: "/admin/invoices?status=pending" },
                { label: "Pending Leads", value: pendingLeads, icon: UserPlus, color: "text-orange-500", bg: "bg-orange-50", href: "/admin/clients?tab=leads" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} shrink-0`}>
                      <Icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-xl font-bold text-gray-900">{item.value}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-gray-300" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Renewal at a glance */}
          <Card className="border-gray-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Renewals this week</p>
                <Clock className="h-4 w-4 text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{renewals.filter((r) => r.daysLeft <= 7).length}</p>
              <p className="text-xs text-gray-400 mt-1">
                ₹{renewals.filter((r) => r.daysLeft <= 7).reduce((s, r) => s + r.amount, 0).toLocaleString("en-IN")} at risk
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Renewals + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-100">
          <CardHeader className="pb-3 px-5 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />Upcoming Renewals
              </CardTitle>
              <Badge variant="secondary" className="text-xs">{renewals.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <RenewalsList items={renewals} />
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />Live Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <ActivityFeed items={activity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

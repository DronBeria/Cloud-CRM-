import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { db } from "@/lib/db";

export const revalidate = 30;
import { subDays, subMonths, startOfMonth, format } from "date-fns";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Users, Server, MessageSquare,
  Clock, AlertCircle, UserPlus, IndianRupee, ArrowRight,
  CheckCircle, FileText, Activity, Zap,
} from "lucide-react";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { ActivityFeed } from "@/components/admin/dashboard/ActivityFeed";
import { RenewalsList } from "@/components/admin/dashboard/RenewalsList";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";

export const metadata: Metadata = { title: "Dashboard" };

async function getInrRate() {
  try {
    const s = await db.setting.findFirst({ where: { key: "inr_exchange_rate" }, select: { value: true } });
    return parseFloat(s?.value ?? "83.5");
  } catch { return 83.5; }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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

  const clientRole = await db.role.findFirst({
    where: { name: "user" },
    select: { id: true },
  }).catch(() => null);

  const [
    activeServices,
    revenue30d,
    totalClients,
    newClientsThisMonth,
    newClientsLastMonth,
    openTickets,
    pendingInvoicesCount,
    pendingLeads,
    upcomingRenewals,
    recentClients,
    recentPayments,
    recentTickets,
    recentServices,
    recentLeads,
  ] = await Promise.all([
    db.service.findMany({ where: { status: "active" }, select: { id: true, price: true, plan: { select: { billingUnit: true, billingPeriod: true, isOneTime: true } }, currency: { select: { code: true, exchangeRate: true } } } }),
    db.invoiceTransaction.findMany({ where: { status: "succeeded", createdAt: { gte: startOf30d } }, select: { amount: true, invoice: { select: { currency: { select: { code: true, exchangeRate: true } } } } } }),
    db.user.count({ where: clientRole?.id ? { roleId: clientRole.id } : { role: { name: "user" } } }),
    db.user.count({ where: { ...(clientRole?.id ? { roleId: clientRole.id } : { role: { name: "user" } }), createdAt: { gte: startOfThisMonth } } }),
    db.user.count({ where: { ...(clientRole?.id ? { roleId: clientRole.id } : { role: { name: "user" } }), createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
    db.ticket.count({ where: { status: { in: ["open", "replied"] } } }),
    db.invoice.count({ where: { status: "pending" } }),
    db.lead.count({ where: { status: { in: ["new", "contacted", "qualified"] } } }).catch(() => 0),
    db.service.findMany({
      where: { status: "active", expiresAt: { gte: now, lte: subDays(now, -30) } },
      select: { id: true, price: true, expiresAt: true, product: { select: { name: true } }, plan: { select: { name: true } }, user: { select: { name: true, email: true } }, currency: { select: { code: true, exchangeRate: true } } },
      orderBy: { expiresAt: "asc" },
      take: 12,
    }),
    db.user.findMany({ where: clientRole?.id ? { roleId: clientRole.id } : { role: { name: "user" } }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, name: true, email: true, createdAt: true } }),
    db.invoiceTransaction.findMany({ where: { status: "succeeded" }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, amount: true, createdAt: true, invoice: { select: { user: { select: { name: true } }, currency: { select: { code: true, exchangeRate: true } } } } } }),
    db.ticket.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, subject: true, createdAt: true, user: { select: { name: true } } } }),
    db.service.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, createdAt: true, product: { select: { name: true } }, user: { select: { name: true } } } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, name: true, source: true, status: true, createdAt: true } }).catch(() => [] as typeof recentLeads),
  ]);

  // MRR
  let mrr = 0;
  for (const s of activeServices) {
    if (!s.plan || s.plan.isOneTime) continue;
    let price = Number(s.price);
    if (price <= 0) continue;
    if (s.plan.billingUnit === "year") price /= 12;
    else if (s.plan.billingUnit === "day") price *= 30;
    else if (s.plan.billingUnit === "week") price *= 4.33;
    if (s.currency.code !== "INR") price = (price / Number(s.currency.exchangeRate)) * inrRate;
    mrr += price;
  }

  // Revenue
  let revenue = 0;
  for (const t of revenue30d) {
    const c = t.invoice?.currency;
    revenue += c ? (Number(t.amount) / Number(c.exchangeRate)) * inrRate : Number(t.amount) * inrRate;
  }

  const clientGrowth = newClientsLastMonth > 0
    ? Math.round(((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100)
    : newClientsThisMonth > 0 ? 100 : 0;

  const renewals = upcomingRenewals.map((s) => {
    const price = Number(s.price);
    const priceInr = s.currency.code === "INR" ? price : (price / Number(s.currency.exchangeRate)) * inrRate;
    const daysLeft = Math.ceil((new Date(s.expiresAt!).getTime() - now.getTime()) / 86400000);
    return { id: s.id, clientName: s.user.name, clientEmail: s.user.email, serviceName: s.product.name, planName: s.plan?.name ?? "", amount: Math.round(priceInr), daysLeft, expiresAt: s.expiresAt!.toISOString(), hasInvoice: false };
  });

  const activity = [
    ...recentClients.map((c) => ({ type: "client_joined" as const, title: "New client", subtitle: c.name, time: c.createdAt.toISOString(), id: c.id })),
    ...recentPayments.map((t) => {
      const amtInr = t.invoice?.currency ? Math.round((Number(t.amount) / Number(t.invoice.currency.exchangeRate)) * inrRate) : Math.round(Number(t.amount) * inrRate);
      return { type: "payment_received" as const, title: `₹${amtInr.toLocaleString("en-IN")} received`, subtitle: t.invoice?.user?.name ?? "Client", time: t.createdAt.toISOString(), id: t.id };
    }),
    ...recentTickets.map((t) => ({ type: "ticket_opened" as const, title: "New ticket", subtitle: t.subject, time: t.createdAt.toISOString(), id: t.id })),
    ...recentServices.map((s) => ({ type: "service_created" as const, title: "Service activated", subtitle: `${s.product.name} · ${s.user.name}`, time: s.createdAt.toISOString(), id: s.id })),
    ...(Array.isArray(recentLeads) ? recentLeads.map((l) => ({ type: "lead_created" as const, title: "New lead", subtitle: `${l.name} via ${l.source}`, time: l.createdAt.toISOString(), id: l.id })) : []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

  const firstName = session.user?.name?.split(" ")[0] ?? "Admin";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium">{format(now, "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            {getGreeting()}, {firstName} 👋
          </h1>
        </div>
        <QuickActions />
      </div>

      {/* Pending lead banner */}
      {pendingLeads > 0 && (
        <Link href="/admin/clients?tab=leads">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors group">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 shrink-0">
              <UserPlus className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">{pendingLeads} {pendingLeads === 1 ? "lead" : "leads"}</span> waiting to be accepted as clients
            </p>
            <ArrowRight className="h-4 w-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/invoices">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">MRR</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{Math.round(mrr).toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-400 mt-1">ARR ₹{Math.round(mrr * 12 / 1000).toLocaleString("en-IN")}K</p>
          </div>
        </Link>

        <Link href="/admin/invoices?status=paid">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue (30d)</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{Math.round(revenue).toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </div>
        </Link>

        <Link href="/admin/clients">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Clients</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 group-hover:bg-violet-100 transition-colors">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
            <div className="flex items-center gap-1 mt-1">
              {clientGrowth >= 0
                ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                : <TrendingDown className="h-3 w-3 text-red-400" />}
              <p className={`text-xs ${clientGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {clientGrowth >= 0 ? "+" : ""}{clientGrowth}% this month
              </p>
            </div>
          </div>
        </Link>

        <Link href="/admin/services">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Services</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 group-hover:bg-orange-100 transition-colors">
                <Server className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeServices.length}</p>
            <p className="text-xs text-gray-400 mt-1">{pendingInvoicesCount} pending invoices</p>
          </div>
        </Link>
      </div>

      {/* Alert row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open Tickets", value: openTickets, icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50", href: "/admin/tickets", urgent: openTickets > 5 },
          { label: "Pending Invoices", value: pendingInvoicesCount, icon: FileText, color: "text-rose-600", bg: "bg-rose-50", href: "/admin/invoices?status=pending", urgent: pendingInvoicesCount > 0 },
          { label: "Renewals (7d)", value: renewals.filter(r => r.daysLeft <= 7).length, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50", href: "/admin/services", urgent: false },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className={`flex items-center gap-3 p-4 bg-white border rounded-xl hover:shadow-sm transition-all cursor-pointer ${item.urgent && item.value > 0 ? "border-rose-100" : "border-gray-100"}`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} shrink-0`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-xl font-bold text-gray-900">{item.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Revenue chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5">
          <RevenueChart initialRange="30d" />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Activity</p>
            <Activity className="h-4 w-4 text-gray-300" />
          </div>
          <ActivityFeed items={activity} />
        </div>
      </div>

      {/* Renewals */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Upcoming Renewals</p>
            <p className="text-xs text-gray-400 mt-0.5">{renewals.length} services in next 30 days</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">₹{renewals.reduce((s, r) => s + r.amount, 0).toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-400">at risk</p>
          </div>
        </div>
        <RenewalsList items={renewals} />
      </div>
    </div>
  );
}

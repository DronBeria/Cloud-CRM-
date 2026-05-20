import { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import {
  ExternalLink, Monitor, FileText, MessageSquare,
  Plus, AlertCircle, CheckCircle, Clock,
  IndianRupee, ChevronRight, Server, ArrowUpRight,
  Wifi, Package, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickPayButton } from "@/components/client/QuickPayButton";
import { QuickTicketButton } from "@/components/client/QuickTicketButton";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

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

export default async function DashboardPage() {
  const currentUser = await getUser();
  if (!currentUser) redirect("/login");

  const userId = currentUser.id;
  const inrRate = await getInrRate();

  const [services, invoices, tickets, credits, notifications] = await Promise.all([
    db.service.findMany({
      where: { userId, status: { not: "cancelled" } },
      include: { product: true, plan: true, currency: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }).catch(() => []),
    db.invoice.findMany({
      where: { userId, status: { in: ["pending", "paid"] } },
      include: { currency: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }).catch(() => []),
    db.ticket.findMany({
      where: { userId, status: { not: "closed" } },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }).catch(() => []),
    db.credit.findMany({ where: { userId } }).catch(() => []),
    db.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 3,
    }).catch(() => []),
  ]);

  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const totalDue = pendingInvoices.reduce((sum, inv) => {
    const t = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    return sum + (inv.currency.code === "INR" ? t : (t / Number(inv.currency.exchangeRate)) * inrRate);
  }, 0);

  const activeServices = services.filter((s) => s.status === "active");
  const creditBalance = credits.reduce((s, c) => s + Number(c.amount), 0);
  const firstName = currentUser.name?.split(" ")[0] ?? "there";

  // Upcoming renewals
  const renewals = services.filter((s) => s.status === "active" && s.expiresAt).map((s) => ({
    ...s,
    daysLeft: differenceInDays(new Date(s.expiresAt!), new Date()),
  })).filter((s) => s.daysLeft >= 0 && s.daysLeft <= 14).sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            {getGreeting()}, <span className="text-indigo-600">{firstName}</span> 👋
          </h1>
        </div>
        {notifications.length > 0 && (
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <span className="text-xs font-bold text-orange-600">{notifications.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Overdue alert */}
      {totalDue > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-800">
              ₹{Math.round(totalDue).toLocaleString("en-IN")} payment due
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {pendingInvoices.length} unpaid invoice{pendingInvoices.length !== 1 ? "s" : ""} — pay now to keep services active
            </p>
          </div>
          <QuickPayButton invoices={pendingInvoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber ?? `#${inv.number}`,
            total: inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0),
            totalInr: Math.round(inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0) *
              (inv.currency.code === "INR" ? 1 : inrRate / Number(inv.currency.exchangeRate))),
          }))} />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Services", value: activeServices.length, icon: Server, color: "text-indigo-600", bg: "bg-indigo-50", href: "/services" },
          { label: "Pending Bills", value: pendingInvoices.length, icon: FileText, color: pendingInvoices.length > 0 ? "text-red-500" : "text-gray-400", bg: pendingInvoices.length > 0 ? "bg-red-50" : "bg-gray-50", href: "/invoices" },
          { label: "Open Tickets", value: tickets.length, icon: Headphones, color: tickets.length > 0 ? "text-amber-500" : "text-gray-400", bg: tickets.length > 0 ? "bg-amber-50" : "bg-gray-50", href: "/tickets" },
          { label: "Credits", value: `₹${creditBalance.toFixed(0)}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50", href: "/account" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Services — main section */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-gray-800">My Services</p>
          <Link href="/services" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            All services <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 mb-4">
              <Package className="h-7 w-7 text-indigo-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No services yet</h3>
            <p className="text-sm text-gray-500 mb-4">Browse our cloud services and hosting plans to get started.</p>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Link href="/"><Plus className="h-4 w-4" />Browse Services</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {services.map((s) => {
              const meta = s.metadata as Record<string, string> | null;
              const hasTsplus = s.status === "active" && meta?.tsplus_username;
              const isTallyLike = s.product.slug.toLowerCase().match(/tally|rdp|desktop|tsplus|remote/);
              const priceInr = s.currency.code === "INR"
                ? Number(s.price)
                : (Number(s.price) / Number(s.currency.exchangeRate)) * inrRate;
              const daysLeft = s.expiresAt ? differenceInDays(new Date(s.expiresAt), new Date()) : null;

              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                  {/* Icon */}
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${isTallyLike ? "bg-violet-100" : "bg-blue-100"}`}>
                    {isTallyLike ? (
                      <Monitor className="h-5 w-5 text-violet-600" />
                    ) : (
                      <Server className="h-5 w-5 text-blue-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {s.label ?? s.product.name}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                        s.status === "active" ? "bg-emerald-50 text-emerald-700" :
                        s.status === "suspended" ? "bg-amber-50 text-amber-700" :
                        s.status === "pending" ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {s.status === "active" ? "● Active" : s.status === "suspended" ? "⚠ Suspended" : s.status === "pending" ? "⟳ Pending" : s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>{s.plan?.name}</span>
                      {priceInr > 0 && <span>₹{Math.round(priceInr).toLocaleString("en-IN")}/{s.plan?.billingUnit ?? "mo"}</span>}
                      {daysLeft !== null && daysLeft <= 14 && (
                        <span className={daysLeft <= 3 ? "text-red-500 font-medium" : "text-amber-500"}>
                          Renews in {daysLeft}d
                        </span>
                      )}
                      {daysLeft !== null && daysLeft > 14 && s.expiresAt && (
                        <span>Renews {format(new Date(s.expiresAt), "d MMM yyyy")}</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {hasTsplus && meta?.tsplus_launch_url ? (
                    <a
                      href={meta.tsplus_launch_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shrink-0 shadow-sm shadow-indigo-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Launch
                    </a>
                  ) : (
                    <Link href={`/services/${s.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Manage <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom grid — Invoices + Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Invoices */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-800">Recent Invoices</p>
            <Link href="/invoices" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <FileText className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.slice(0, 4).map((inv) => {
                const total = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
                const totalInr = inv.currency.code === "INR" ? total : (total / Number(inv.currency.exchangeRate)) * inrRate;
                const isPending = inv.status === "pending";
                return (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${isPending ? "bg-red-50" : "bg-emerald-50"}`}>
                      {isPending ? <Clock className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{inv.invoiceNumber ?? `#${inv.number}`}</p>
                      <p className="text-xs text-gray-400">{format(new Date(inv.createdAt), "d MMM yyyy")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">₹{Math.round(totalInr).toLocaleString("en-IN")}</p>
                      {isPending && (
                        <Link href={`/invoices/${inv.id}`}>
                          <span className="text-[10px] text-red-600 font-semibold hover:underline">Pay now →</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Support + quick actions */}
        <div className="space-y-4">
          {/* Open Tickets */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-800">Support</p>
              <QuickTicketButton />
            </div>

            {tickets.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 shrink-0">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">All clear!</p>
                  <p className="text-xs text-gray-400">No open support tickets</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {tickets.map((t) => (
                  <Link key={t.id} href={`/tickets/${t.id}`}>
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${t.status === "open" ? "bg-blue-500" : "bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.subject}</p>
                        <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Renewal warning */}
          {renewals.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />Upcoming renewals
              </p>
              <div className="space-y-2">
                {renewals.slice(0, 2).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-amber-800 font-medium truncate max-w-[140px]">{r.label ?? r.product.name}</span>
                    <span className={`font-bold ${r.daysLeft <= 3 ? "text-red-600" : "text-amber-600"}`}>
                      {r.daysLeft === 0 ? "Today!" : `${r.daysLeft} days`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

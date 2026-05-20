import { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText, Server, MessageSquare, Plus, ArrowRight,
  ExternalLink, Clock, AlertCircle, CheckCircle, Monitor,
  IndianRupee, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic"; // user-specific — never cache

async function getInrRate() {
  try {
    const s = await db.setting.findFirst({ where: { key: "inr_exchange_rate" }, select: { value: true } });
    return parseFloat(s?.value ?? "83.5");
  } catch { return 83.5; }
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  pending: "bg-blue-500",
  suspended: "bg-amber-500",
  cancelled: "bg-red-400",
};

export default async function DashboardPage() {
  const currentUser = await getUser();
  if (!currentUser) redirect("/login");

  const userId = currentUser!.id;
  const inrRate = await getInrRate();

  const [services, invoices, tickets, credits] = await Promise.all([
    db.service.findMany({
      where: { userId, status: { not: "cancelled" } },
      include: { product: true, plan: true, currency: true },
      orderBy: { status: "asc" },
      take: 6,
    }),
    db.invoice.findMany({
      where: { userId, status: { in: ["pending", "paid"] } },
      include: { currency: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.ticket.findMany({
      where: { userId, status: { not: "closed" } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    db.credit.findMany({ where: { userId }, include: { currency: true } }),
  ]);

  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const totalDue = pendingInvoices.reduce((sum, inv) => {
    const t = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    return sum + (inv.currency.code === "INR" ? t : (t / Number(inv.currency.exchangeRate)) * inrRate);
  }, 0);

  const activeServices = services.filter((s) => s.status === "active");
  const creditBalance = credits.reduce((s, c) => s + Number(c.amount), 0);
  const firstName = currentUser.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hi, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>
      </div>

      {/* Overdue alert */}
      {totalDue > 0 && (
        <Link href="/invoices">
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-100 transition-colors group">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800">
                ₹{Math.round(totalDue).toLocaleString("en-IN")} due
              </p>
              <p className="text-xs text-rose-500">{pendingInvoices.length} unpaid invoice{pendingInvoices.length !== 1 ? "s" : ""} — pay now to keep services active</p>
            </div>
            <ArrowRight className="h-4 w-4 text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Services", value: activeServices.length, icon: Server, color: "text-indigo-600", bg: "bg-indigo-50", href: "/services" },
          { label: "Pending Invoices", value: pendingInvoices.length, icon: FileText, color: pendingInvoices.length > 0 ? "text-rose-600" : "text-gray-400", bg: pendingInvoices.length > 0 ? "bg-rose-50" : "bg-gray-50", href: "/invoices" },
          { label: "Open Tickets", value: tickets.length, icon: MessageSquare, color: tickets.length > 0 ? "text-amber-600" : "text-gray-400", bg: tickets.length > 0 ? "bg-amber-50" : "bg-gray-50", href: "/tickets" },
          { label: "Credits", value: `₹${creditBalance.toFixed(0)}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50", href: "/account" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main content: Services + Invoices side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Services */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">My Services</p>
            <Link href="/services" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-8">
              <Server className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No services yet</p>
              <Link href="/">
                <Button size="sm" className="mt-3 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />Browse Services
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map((s) => {
                const meta = s.metadata as Record<string, string> | null;
                const hasTsplus = s.status === "active" && meta?.tsplus_username;
                const isTallyLike = s.product.slug.toLowerCase().includes("tally") || s.product.slug.toLowerCase().includes("rdp") || s.product.slug.toLowerCase().includes("desktop");

                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${hasTsplus || isTallyLike ? "bg-violet-100" : "bg-blue-100"}`}>
                      {hasTsplus || isTallyLike
                        ? <Monitor className="h-4 w-4 text-violet-600" />
                        : <Server className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.label ?? s.product.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[s.status] ?? "bg-gray-300"}`} />
                        <p className="text-xs text-gray-400 capitalize">{s.status}
                          {s.expiresAt && s.status === "active" && (
                            <span className="text-gray-300"> · renews {format(new Date(s.expiresAt), "d MMM")}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {hasTsplus && meta?.tsplus_launch_url ? (
                      <a
                        href={meta.tsplus_launch_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />Launch
                      </a>
                    ) : (
                      <Link
                        href={`/services/${s.id}`}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        View
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Recent Invoices</p>
            <Link href="/invoices" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const total = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
                const totalInr = inv.currency.code === "INR" ? total : (total / Number(inv.currency.exchangeRate)) * inrRate;
                const isPending = inv.status === "pending";

                return (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}>
                    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isPending ? "hover:bg-rose-50/50" : "hover:bg-gray-50"}`}>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${isPending ? "bg-rose-50" : "bg-emerald-50"}`}>
                        {isPending
                          ? <Clock className="h-4 w-4 text-rose-500" />
                          : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{inv.invoiceNumber ?? `#${inv.number}`}</p>
                        <p className="text-xs text-gray-400">
                          {isPending && inv.dueAt
                            ? `Due ${format(new Date(inv.dueAt), "d MMM yyyy")}`
                            : format(new Date(inv.createdAt), "d MMM yyyy")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">₹{Math.round(totalInr).toLocaleString("en-IN")}</p>
                        {isPending && (
                          <span className="text-[10px] text-rose-600 font-semibold">UNPAID</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Support tickets */}
      {tickets.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Open Tickets</p>
            <div className="flex items-center gap-2">
              <Link href="/tickets/create">
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                  <Plus className="h-3 w-3" />New
                </Button>
              </Link>
              <Link href="/tickets" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {tickets.map((t) => (
              <Link key={t.id} href={`/tickets/${t.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 shrink-0">
                    <MessageSquare className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400">Updated {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${t.status === "open" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>
                    {t.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state CTA */}
      {services.length === 0 && invoices.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 mx-auto mb-4">
            <Server className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Welcome to {process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
            Browse our services to get started. Your invoices and services will appear here.
          </p>
          <Link href="/">
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />Browse Services
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

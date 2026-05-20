"use client";

import useSWR from "swr";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  ExternalLink, Monitor, FileText, MessageSquare, Plus,
  AlertCircle, CheckCircle, Clock, IndianRupee, ChevronRight,
  Server, Headphones, Gift, Zap, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickPayButton } from "@/components/client/QuickPayButton";
import { QuickTicketButton } from "@/components/client/QuickTicketButton";
import { useState } from "react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-7 w-48 mt-1" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Free Trial Banner ─────────────────────────────────────────────────────────
function TrialBanner({ trial, onClaimed }: { trial: { planName: string; days: number } | null; onClaimed: () => void }) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!trial || dismissed) return null;

  const claim = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/trial", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(`🎉 ${data.service.trialDays}-day trial activated!`);
    onClaimed();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-5">
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <button onClick={() => setDismissed(true)} className="absolute top-3 right-3 text-white/60 hover:text-white">
        <X className="h-4 w-4" />
      </button>
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 shrink-0">
          <Gift className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold">Start your free {trial.days}-day trial</p>
          <p className="text-indigo-200 text-sm">Full access to {trial.planName} — no credit card needed</p>
        </div>
        <Button onClick={claim} disabled={loading} size="sm"
          className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold gap-1.5 shrink-0 shadow-lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" />Claim</>}
        </Button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { data, error, mutate } = useSWR("/api/client/dashboard", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // cache 30s
  });

  if (!data && !error) return <DashboardSkeleton />;
  if (error || data?.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-300" />
        <p className="text-gray-500">Failed to load dashboard. <button onClick={() => mutate()} className="text-indigo-600 underline">Try again</button></p>
      </div>
    );
  }

  const { user, stats, services, invoices, tickets, trial } = data;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const pendingInvoicesForPay = invoices
    ?.filter((i: any) => i.status === "pending")
    .map((i: any) => ({ id: i.id, invoiceNumber: i.invoiceNumber, total: i.totalInr, totalInr: i.totalInr }));

  const renewals = services?.filter((s: any) => s.daysLeft !== null && s.daysLeft >= 0 && s.daysLeft <= 14)
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft) ?? [];

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            {greeting()}, <span className="text-indigo-600">{firstName}</span> 👋
          </h1>
        </div>
        {stats?.unreadNotifications > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
            <span className="text-xs font-bold text-orange-600">{stats.unreadNotifications}</span>
          </div>
        )}
      </div>

      {/* Trial banner */}
      <TrialBanner trial={trial} onClaimed={() => mutate()} />

      {/* Overdue alert */}
      {stats?.totalDue > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-800">₹{stats.totalDue.toLocaleString("en-IN")} payment due</p>
            <p className="text-xs text-red-500">{stats.pendingInvoices} unpaid — pay to keep services active</p>
          </div>
          <QuickPayButton invoices={pendingInvoicesForPay ?? []} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Services", value: stats?.activeServices ?? 0, icon: Server, color: "text-indigo-600", bg: "bg-indigo-50", href: "/services" },
          { label: "Pending Bills", value: stats?.pendingInvoices ?? 0, icon: FileText, color: stats?.pendingInvoices > 0 ? "text-red-500" : "text-gray-400", bg: stats?.pendingInvoices > 0 ? "bg-red-50" : "bg-gray-50", href: "/invoices" },
          { label: "Open Tickets", value: stats?.openTickets ?? 0, icon: Headphones, color: stats?.openTickets > 0 ? "text-amber-500" : "text-gray-400", bg: stats?.openTickets > 0 ? "bg-amber-50" : "bg-gray-50", href: "/tickets" },
          { label: "Credits", value: `₹${(stats?.creditBalance ?? 0).toFixed(0)}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50", href: "/account" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} prefetch>
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

      {/* Services */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-gray-800">My Services</p>
          <Link href="/services" prefetch className="text-xs text-indigo-600 font-medium flex items-center gap-1">
            All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!services?.length ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 mb-3">
              <Server className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">No services yet</h3>
            <p className="text-xs text-gray-500 mb-3">Browse plans and get started in minutes.</p>
            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
              <Link href="/"><Plus className="h-3.5 w-3.5" />Browse Services</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {services.map((s: any) => {
              const meta = s.metadata as Record<string, string> | null;
              const hasLaunch = s.status === "active" && meta?.tsplus_launch_url;
              const isTallyLike = s.productSlug?.match(/tally|rdp|desktop|tsplus|remote/i);
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${isTallyLike ? "bg-violet-100" : "bg-blue-100"}`}>
                    {isTallyLike ? <Monitor className="h-5 w-5 text-violet-600" /> : <Server className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        s.status === "active" ? "bg-emerald-50 text-emerald-700" :
                        s.status === "suspended" ? "bg-amber-50 text-amber-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {s.status === "active" ? "● Active" : s.status === "suspended" ? "⚠ Suspended" : "⟳ Pending"}
                      </span>
                      {s.isTrial && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">Trial</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {s.planName && <span>{s.planName}</span>}
                      {s.priceInr > 0 && <span>₹{s.priceInr.toLocaleString("en-IN")}/{s.billingUnit}</span>}
                      {s.daysLeft !== null && s.daysLeft <= 14 && (
                        <span className={s.daysLeft <= 3 ? "text-red-500 font-semibold" : "text-amber-500"}>
                          Renews in {s.daysLeft}d
                        </span>
                      )}
                    </div>
                  </div>
                  {hasLaunch ? (
                    <a href={meta!.tsplus_launch_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shrink-0 shadow-sm shadow-indigo-200">
                      <ExternalLink className="h-3.5 w-3.5" />Launch
                    </a>
                  ) : (
                    <Link href={`/services/${s.id}`} prefetch>
                      <Button variant="ghost" size="sm" className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Manage
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices + Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Invoices */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-800">Invoices</p>
            <Link href="/invoices" prefetch className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {!invoices?.length ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <p className="text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.slice(0, 4).map((inv: any) => (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${inv.status === "pending" ? "bg-red-50" : "bg-emerald-50"}`}>
                    {inv.status === "pending" ? <Clock className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{format(new Date(inv.createdAt), "d MMM yyyy")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">₹{inv.totalInr.toLocaleString("en-IN")}</p>
                    {inv.status === "pending" && (
                      <Link href={`/invoices/${inv.id}`} prefetch>
                        <span className="text-[10px] text-red-600 font-semibold hover:underline">Pay →</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-800">Support</p>
              <QuickTicketButton />
            </div>
            {!tickets?.length ? (
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
                {tickets.map((t: any) => (
                  <Link key={t.id} href={`/tickets/${t.id}`} prefetch>
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

          {renewals.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />Upcoming renewals
              </p>
              {renewals.slice(0, 2).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-amber-800 font-medium truncate max-w-[140px]">{r.name}</span>
                  <span className={`font-bold ${r.daysLeft <= 3 ? "text-red-600" : "text-amber-600"}`}>
                    {r.daysLeft === 0 ? "Today!" : `${r.daysLeft}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import useSWR from "swr";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  TrendingUp, TrendingDown, Users, Server, MessageSquare,
  Clock, AlertCircle, UserPlus, IndianRupee, ArrowUpRight,
  Activity, RefreshCw, AlertTriangle,
} from "lucide-react";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { ActivityFeed } from "@/components/admin/dashboard/ActivityFeed";
import { RenewalsList } from "@/components/admin/dashboard/RenewalsList";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-7 w-52" /></div>
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function AdminDashboardPage() {
  const { data, error, mutate, isLoading } = useSWR(
    "/api/admin/dashboard?range=30d",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  if (isLoading) return <DashboardSkeleton />;

  if (error || data?.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-red-300" />
        <p className="text-gray-500 text-sm">Failed to load dashboard</p>
        <Button size="sm" variant="outline" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />Retry
        </Button>
      </div>
    );
  }

  const { stats, chartData, renewals, activity } = data ?? {};

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            {greeting()},{" "}
            <span className="text-orange-500">Admin</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => mutate()} className="h-8 text-gray-400 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <QuickActions />
        </div>
      </div>

      {/* Pending lead alert */}
      {stats?.pendingLeads > 0 && (
        <Link href="/admin/clients?tab=leads">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors group">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 shrink-0">
              <UserPlus className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">{stats.pendingLeads} {stats.pendingLeads === 1 ? "lead" : "leads"}</span> waiting to be accepted
            </p>
            <ArrowUpRight className="h-4 w-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: `₹${(stats?.mrr ?? 0).toLocaleString("en-IN")}`, sub: `ARR ₹${Math.round((stats?.arr ?? 0) / 1000)}K`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50", href: "/admin/invoices" },
          { label: "Revenue (30d)", value: `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`, sub: "Collected", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/invoices" },
          {
            label: "Clients",
            value: stats?.newClientsThisMonth ?? 0,
            sub: `${(stats?.clientGrowth ?? 0) >= 0 ? "+" : ""}${stats?.clientGrowth ?? 0}% vs last month`,
            trend: stats?.clientGrowth,
            icon: Users, color: "text-violet-600", bg: "bg-violet-50", href: "/admin/clients",
          },
          { label: "Active Services", value: stats?.activeServicesCount ?? 0, sub: `${stats?.pendingInvoices ?? 0} pending invoices`, icon: Server, color: "text-orange-600", bg: "bg-orange-50", href: "/admin/services" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} prefetch>
              <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{s.label}</p>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{s.value}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  {"trend" in s && s.trend !== undefined && (
                    s.trend >= 0
                      ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                      : <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <p className={`text-xs ${"trend" in s && s.trend !== undefined && s.trend < 0 ? "text-red-400" : "text-gray-400"}`}>
                    {s.sub}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Alert row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open Tickets", value: stats?.openTickets ?? 0, icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50", href: "/admin/tickets" },
          { label: "Pending Invoices", value: stats?.pendingInvoices ?? 0, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", href: "/admin/invoices?status=pending" },
          { label: "Pending Leads", value: stats?.pendingLeads ?? 0, icon: UserPlus, color: "text-orange-500", bg: "bg-orange-50", href: "/admin/clients?tab=leads" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} prefetch>
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all cursor-pointer">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} shrink-0`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-xl font-bold text-gray-900">{item.value}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-200 ml-auto" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Revenue chart + quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5">
          <RevenueChart initialRange="30d" initialData={chartData ?? []} />
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Live Activity</p>
            <Activity className="h-4 w-4 text-gray-300" />
          </div>
          <ActivityFeed items={activity ?? []} />
        </div>
      </div>

      {/* Renewals + empty state */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />Upcoming Renewals
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{renewals?.length ?? 0} services in next 30 days</p>
          </div>
          {renewals?.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">
                ₹{(renewals ?? []).reduce((s: number, r: any) => s + r.amount, 0).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-400">at risk</p>
            </div>
          )}
        </div>
        <RenewalsList items={renewals ?? []} />
      </div>
    </div>
  );
}

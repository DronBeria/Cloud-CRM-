import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import {
  Users, FileText, Server, DollarSign, MessageSquare,
  TrendingUp, Clock, AlertCircle, UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard — Admin" };

export default async function AdminDashboardPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isStaff(role)) redirect("/admin/login");

  const clientRole = await db.role.findFirst({ where: { name: "user" } });
  const clientRoleId = clientRole?.id;

  const [
    totalClients,
    activeServices,
    openTickets,
    pendingLeads,
    recentInvoices,
    recentClients,
    revenue,
    pendingInvoicesCount,
  ] = await Promise.all([
    // Only count actual clients, not staff
    db.user.count({ where: { roleId: clientRoleId } }),
    db.service.count({ where: { status: "active" } }),
    db.ticket.count({ where: { status: { in: ["open", "replied"] } } }),
    db.lead.count({ where: { status: { in: ["new", "contacted", "qualified"] } } }),
    db.invoice.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        currency: true,
        items: true,
      },
    }),
    // Recent clients only
    db.user.findMany({
      where: { roleId: clientRoleId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { services: true, invoices: true } },
      },
    }),
    db.invoiceTransaction.aggregate({
      where: { status: "succeeded" },
      _sum: { amount: true },
    }),
    db.invoice.count({ where: { status: "pending" } }),
  ]);

  const totalRevenue = Number(revenue._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform summary and recent activity</p>
      </div>

      {/* Pending leads alert */}
      {pendingLeads > 0 && (
        <Link href="/admin/clients?tab=leads">
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 shrink-0">
              <UserPlus className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">
                {pendingLeads} new {pendingLeads === 1 ? "lead" : "leads"} waiting for review
              </p>
              <p className="text-xs text-orange-600 mt-0.5">Click to review and accept clients</p>
            </div>
            <Badge className="bg-orange-500 text-white border-0">{pendingLeads}</Badge>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: totalClients, icon: Users, color: "text-blue-500", bg: "bg-blue-50", href: "/admin/clients" },
          { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50", href: "/admin/invoices" },
          { label: "Active Services", value: activeServices, icon: Server, color: "text-violet-500", bg: "bg-violet-50", href: "/admin/services" },
          { label: "Open Tickets", value: openTickets, icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-50", href: "/admin/tickets" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="border-gray-100 hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-gray-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 shrink-0">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending Invoices</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{pendingInvoicesCount}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link href="/admin/invoices?status=pending">View</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <UserPlus className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending Leads</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{pendingLeads}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link href="/admin/clients?tab=leads">Review</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link href="/admin/invoices">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentInvoices.map((inv) => {
                const total = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
                return (
                  <div key={inv.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{inv.user.name}</p>
                      <p className="text-xs text-gray-400">{inv.invoiceNumber ?? `#${inv.number}`}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {inv.currency.prefix}{total.toFixed(2)}{inv.currency.suffix}
                      </p>
                      <Badge
                        variant={inv.status === "paid" ? "success" : inv.status === "cancelled" ? "destructive" : "info"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {recentInvoices.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No invoices yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Recent Clients</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link href="/admin/clients">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentClients.map((client) => (
                <Link key={client.id} href={`/admin/clients/${client.id}`}>
                  <div className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs font-semibold shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                      <p className="text-xs text-gray-400 truncate">{client.email}</p>
                    </div>
                    <div className="text-right shrink-0 text-xs text-gray-400">
                      <p>{client._count.services} services</p>
                      <p>{formatDate(client.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {recentClients.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No clients yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

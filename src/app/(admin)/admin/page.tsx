import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Users,
  FileText,
  Server,
  DollarSign,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!session || user?.role !== "admin") redirect("/dashboard");

  const [
    totalUsers,
    totalInvoices,
    activeServices,
    openTickets,
    recentInvoices,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.invoice.count(),
    db.service.count({ where: { status: "active" } }),
    db.ticket.count({ where: { status: { in: ["open", "replied"] } } }),
    db.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        currency: true,
        items: true,
      },
    }),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { role: true },
    }),
  ]);

  const totalRevenue = await db.invoiceTransaction.aggregate({
    where: { status: "succeeded" },
    _sum: { amount: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and analytics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Total Revenue"
          value={`$${Number(totalRevenue._sum.amount ?? 0).toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <StatsCard
          title="Active Services"
          value={activeServices}
          icon={Server}
          iconColor="text-purple-500"
        />
        <StatsCard
          title="Open Tickets"
          value={openTickets}
          icon={MessageSquare}
          iconColor="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((inv) => {
                  const total = inv.items.reduce(
                    (s, i) => s + Number(i.price) * i.quantity,
                    0
                  );
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link
                          href={`/admin/invoices`}
                          className="font-medium hover:text-primary"
                        >
                          #{inv.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.user.name}
                      </TableCell>
                      <TableCell>
                        {inv.currency.prefix}
                        {total.toFixed(2)}
                        {inv.currency.suffix}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === "paid"
                              ? "success"
                              : inv.status === "cancelled"
                              ? "destructive"
                              : "info"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role?.name === "admin" ? "default" : "secondary"}
                      >
                        {u.role?.name ?? "user"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  FileText,
  Server,
  MessageSquare,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";
import { ServiceCard } from "@/components/services/ServiceCard";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [invoices, services, tickets, credits] = await Promise.all([
    db.invoice.findMany({
      where: { userId },
      include: {
        currency: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.service.findMany({
      where: { userId },
      include: {
        product: true,
        plan: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.ticket.findMany({
      where: { userId },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.credit.findMany({
      where: { userId },
      include: { currency: true },
    }),
  ]);

  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const totalDue = pendingInvoices.reduce((sum, inv) => {
    const total = inv.items.reduce(
      (s, item) => s + Number(item.price) * item.quantity,
      0
    );
    return sum + total;
  }, 0);

  const activeServices = services.filter((s) => s.status === "active").length;
  const openTickets = tickets.filter((t) => t.status !== "closed").length;

  const invoicesWithTotal = invoices.map((inv) => ({
    ...inv,
    total: inv.items.reduce(
      (s, item) => s + Number(item.price) * item.quantity,
      0
    ),
    dueAt: inv.dueAt,
    currency: {
      prefix: inv.currency.prefix,
      suffix: inv.currency.suffix,
    },
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {session.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Pending Invoices"
          value={pendingInvoices.length}
          description={`$${totalDue.toFixed(2)} total due`}
          icon={FileText}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Active Services"
          value={activeServices}
          description={`${services.length} total services`}
          icon={Server}
          iconColor="text-purple-500"
        />
        <StatsCard
          title="Open Tickets"
          value={openTickets}
          description={`${tickets.length} total tickets`}
          icon={MessageSquare}
          iconColor="text-green-500"
        />
        <StatsCard
          title="Account Credits"
          value={credits.length > 0 ? `$${credits.reduce((s, c) => s + Number(c.amount), 0).toFixed(2)}` : "$0.00"}
          description="Available balance"
          icon={DollarSign}
          iconColor="text-orange-500"
        />
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Invoices</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {invoicesWithTotal.length > 0 ? (
          <div className="space-y-3">
            {invoicesWithTotal.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No invoices yet</p>
          </div>
        )}
      </div>

      {/* Recent Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Services</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/services">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {services.length > 0 ? (
          <div className="space-y-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No services yet</p>
            <Button className="mt-3" asChild>
              <Link href="/">
                <Plus className="mr-2 h-4 w-4" />
                Order a Service
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Support Tickets</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/tickets/create">
                <Plus className="mr-1 h-4 w-4" />
                New Ticket
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tickets">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        {tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No support tickets</p>
          </div>
        )}
      </div>
    </div>
  );
}

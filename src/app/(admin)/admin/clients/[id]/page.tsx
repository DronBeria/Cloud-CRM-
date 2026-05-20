import { Metadata } from "next";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, MapPin, Building, Calendar,
  FileText, Server, MessageSquare, IndianRupee, UserCheck,
  AlertTriangle, Clock, CheckCircle, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClientDetailTabs } from "@/components/admin/ClientDetailTabs";

export const metadata: Metadata = { title: "Client Profile" };

async function getInrRate() {
  try {
    const s = await db.setting.findFirst({ where: { key: "inr_exchange_rate" } });
    return parseFloat(s?.value ?? "83.5");
  } catch { return 83.5; }
}

const statusBadge: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  open:      "bg-blue-50 text-blue-700 border-blue-200",
  replied:   "bg-violet-50 text-violet-700 border-violet-200",
  closed:    "bg-gray-100 text-gray-600 border-gray-200",
};

export default async function ClientDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const sessionUser = session?.user as { role?: string; id?: string } | undefined;
  if (!session || !isStaff(sessionUser?.role)) redirect("/admin/login");

  const inrRate = await getInrRate();

  const [client, notes] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        role: true,
        invoices: {
          include: { currency: true, items: true, transactions: true },
          orderBy: { createdAt: "desc" },
        },
        services: {
          include: {
            product: { include: { category: true } },
            plan: { include: { prices: { include: { currency: true } } } },
            currency: true,
            cancellation: true,
          },
          orderBy: { createdAt: "desc" },
        },
        tickets: {
          include: {
            messages: {
              include: { user: { select: { name: true, role: { select: { name: true } } } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
        credits: { include: { currency: true } },
      },
    }),
    db.clientNote.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!client) notFound();

  // Financial summary in INR
  const totalPaid = client.invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, inv) => {
      const t = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      return sum + (inv.currency.code === "INR" ? t : (t / Number(inv.currency.exchangeRate)) * inrRate);
    }, 0);

  const totalDue = client.invoices
    .filter((i) => i.status === "pending")
    .reduce((sum, inv) => {
      const t = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      return sum + (inv.currency.code === "INR" ? t : (t / Number(inv.currency.exchangeRate)) * inrRate);
    }, 0);

  const creditBalance = client.credits.reduce((s, c) => s + Number(c.amount), 0);
  const activeServices = client.services.filter((s) => s.status === "active");
  const openTickets = client.tickets.filter((t) => t.status !== "closed");
  const tsplusServices = client.services.filter(
    (s) => (s.metadata as Record<string, string> | null)?.tsplus_username
  );

  const initials = client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // Serializable data for client component
  const clientData = {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    city: client.city,
    state: client.state,
    country: client.country,
    companyName: client.companyName,
    address: client.address,
    postcode: client.postcode,
    createdAt: client.createdAt.toISOString(),
    emailVerifiedAt: client.emailVerifiedAt?.toISOString(),
    role: client.role?.name ?? "user",
  };

  const invoicesData = client.invoices.map((inv) => {
    const total = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    const inr = inv.currency.code === "INR" ? total : (total / Number(inv.currency.exchangeRate)) * inrRate;
    const paid = inv.transactions.filter((t) => t.status === "succeeded").reduce((s, t) => s + Number(t.amount), 0);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber ?? `#${inv.number}`,
      number: inv.number,
      status: inv.status,
      total,
      totalInr: Math.round(inr),
      paid,
      remaining: Math.max(0, total - paid),
      currencyPrefix: inv.currency.prefix,
      currencySuffix: inv.currency.suffix,
      dueAt: inv.dueAt?.toISOString(),
      paidAt: inv.paidAt?.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      itemCount: inv.items.length,
    };
  });

  const servicesData = client.services.map((s) => {
    const meta = s.metadata as Record<string, string> | null;
    const price = Number(s.price);
    const priceInr = s.currency.code === "INR" ? price : (price / Number(s.currency.exchangeRate)) * inrRate;
    return {
      id: s.id,
      productName: s.product.name,
      categoryName: s.product.category?.name,
      planName: s.plan?.name,
      status: s.status,
      priceInr: Math.round(priceInr),
      expiresAt: s.expiresAt?.toISOString(),
      createdAt: s.createdAt.toISOString(),
      hasCancellation: !!s.cancellation,
      cancellationType: s.cancellation?.type,
      // TSplus data
      tsplus: meta?.tsplus_username ? {
        username: meta.tsplus_username,
        password: meta.tsplus_password,
        launchUrl: meta.tsplus_launch_url,
        serverUrl: meta.tsplus_server_url,
        dataPath: meta.tsplus_data_path,
        tallyPath: meta.tsplus_tally_path,
        provisionedAt: meta.tsplus_provisioned_at,
      } : null,
    };
  });

  const ticketsData = client.tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    department: t.department,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    messageCount: t.messages.length,
    messages: t.messages.map((m) => ({
      id: m.id,
      message: m.message,
      isStaff: m.isStaff,
      authorName: m.user.name,
      authorRole: m.user.role?.name ?? "user",
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  const notesData = notes.map((n) => ({
    id: n.id,
    note: n.note,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5" asChild>
          <Link href="/admin/clients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-base shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              {client.emailVerifiedAt && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  <UserCheck className="h-2.5 w-2.5" />Verified
                </span>
              )}
              {tsplusServices.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium">
                  🖥️ TSplus
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{client.email}</p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Paid", value: `₹${Math.round(totalPaid).toLocaleString("en-IN")}`, color: "text-emerald-600", bg: "bg-emerald-50", icon: IndianRupee },
          { label: "Outstanding", value: `₹${Math.round(totalDue).toLocaleString("en-IN")}`, color: totalDue > 0 ? "text-red-500" : "text-gray-400", bg: totalDue > 0 ? "bg-red-50" : "bg-gray-50", icon: AlertTriangle },
          { label: "Active Services", value: activeServices.length, color: "text-blue-600", bg: "bg-blue-50", icon: Server },
          { label: "Open Tickets", value: openTickets.length, color: "text-orange-600", bg: "bg-orange-50", icon: MessageSquare },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} shrink-0`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabbed detail view */}
      <ClientDetailTabs
        client={clientData}
        invoices={invoicesData}
        services={servicesData}
        tickets={ticketsData}
        notes={notesData}
        staffId={sessionUser?.id ?? ""}
        creditBalance={creditBalance}
      />
    </div>
  );
}

import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, MapPin, Building, Calendar,
  FileText, Server, MessageSquare, CreditCard, Activity,
  Edit, Trash2, Shield, UserCheck, Clock, TrendingUp,
  IndianRupee, AlertCircle, CheckCircle, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClientActions } from "@/components/admin/ClientActions";

export const metadata: Metadata = { title: "Client Profile — Admin" };

async function getInrRate() {
  try {
    const s = await db.setting.findFirst({ where: { key: "inr_exchange_rate" } });
    return parseFloat(s?.value ?? "83.5");
  } catch { return 83.5; }
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isStaff(role)) redirect("/admin/login");

  const inrRate = await getInrRate();

  const client = await db.user.findUnique({
    where: { id },
    include: {
      role: true,
      invoices: {
        include: { currency: true, items: true, transactions: true },
        orderBy: { createdAt: "desc" },
      },
      services: {
        include: { product: true, plan: true, currency: true },
        orderBy: { createdAt: "desc" },
      },
      tickets: {
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: "desc" },
      },
      credits: { include: { currency: true } },
    },
  });

  if (!client) notFound();

  // Financials in INR
  const totalPaid = client.invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, inv) => {
      const t = inv.items.reduce((s, item) => s + Number(item.price) * item.quantity, 0);
      const inr = inv.currency.code === "INR" ? t : (t / Number(inv.currency.exchangeRate)) * inrRate;
      return sum + inr;
    }, 0);

  const totalDue = client.invoices
    .filter((i) => i.status === "pending")
    .reduce((sum, inv) => {
      const t = inv.items.reduce((s, item) => s + Number(item.price) * item.quantity, 0);
      const inr = inv.currency.code === "INR" ? t : (t / Number(inv.currency.exchangeRate)) * inrRate;
      return sum + inr;
    }, 0);

  const activeServices = client.services.filter((s) => s.status === "active").length;
  const openTickets = client.tickets.filter((t) => t.status !== "closed").length;

  const initials = client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const isClientRole = client.role?.name === "user";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-1" asChild>
          <Link href="/admin/clients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <Badge className={`text-xs border ${isClientRole ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                  {client.role?.name ?? "user"}
                </Badge>
                {client.emailVerifiedAt && (
                  <Badge className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <UserCheck className="h-3 w-3 mr-1" />Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{client.email}</p>
            </div>
            <div className="ml-auto">
              <ClientActions clientId={id} clientName={client.name} clientRole={client.role?.name ?? "user"} />
            </div>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Paid", value: `₹${Math.round(totalPaid).toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Amount Due", value: `₹${Math.round(totalDue).toLocaleString("en-IN")}`, icon: AlertCircle, color: totalDue > 0 ? "text-red-500" : "text-gray-400", bg: totalDue > 0 ? "bg-red-50" : "bg-gray-50" },
          { label: "Active Services", value: activeServices, icon: Server, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Open Tickets", value: openTickets, icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} shrink-0`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile details */}
        <div className="space-y-4">
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {[
                { icon: Mail, label: "Email", value: client.email },
                client.phone && { icon: Phone, label: "Phone", value: client.phone },
                client.companyName && { icon: Building, label: "Company", value: client.companyName },
                (client.city || client.country) && {
                  icon: MapPin, label: "Location",
                  value: [client.city, client.state, client.country].filter(Boolean).join(", "),
                },
                { icon: Calendar, label: "Joined", value: formatDate(client.createdAt) },
              ].filter(Boolean).map((item: any) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-2.5 text-sm">
                    <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-gray-700 font-medium">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Credits */}
          {client.credits.length > 0 && (
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-600">Credits</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {client.credits.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{c.currency.code}</span>
                    <span className="font-semibold text-emerald-600">
                      {c.currency.prefix}{Number(c.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Tabs content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-400" />Services ({client.services.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {client.services.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No services yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {client.services.map((s) => {
                    const priceInr = s.currency.code === "INR"
                      ? Number(s.price)
                      : (Number(s.price) / Number(s.currency.exchangeRate)) * inrRate;
                    return (
                      <div key={s.id} className="flex items-center gap-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                          <Server className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{s.product.name}</p>
                          <p className="text-xs text-gray-400">{s.plan?.name} · {s.label ?? ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-800">₹{Math.round(priceInr).toLocaleString("en-IN")}</p>
                          {s.expiresAt && (
                            <p className="text-xs text-gray-400">Renews {formatDate(s.expiresAt)}</p>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {s.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />Invoices ({client.invoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {client.invoices.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No invoices yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {client.invoices.slice(0, 8).map((inv) => {
                    const total = inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
                    const inr = inv.currency.code === "INR" ? total : (total / Number(inv.currency.exchangeRate)) * inrRate;
                    return (
                      <div key={inv.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {inv.invoiceNumber ?? `#${inv.number}`}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(inv.createdAt)}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          ₹{Math.round(inr).toLocaleString("en-IN")}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {inv.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />Support Tickets ({client.tickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {client.tickets.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No tickets</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {client.tickets.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.subject}</p>
                        <p className="text-xs text-gray-400">{t._count.messages} messages · {formatDate(t.updatedAt)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusColors[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

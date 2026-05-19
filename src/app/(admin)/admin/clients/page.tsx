import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Users, Search, UserPlus, ArrowRight, Phone, Mail, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientsTabSwitcher } from "@/components/admin/ClientsTabSwitcher";

export const revalidate = 30;

export const metadata: Metadata = { title: "Clients — Admin" };

const LEAD_SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads", facebook: "Facebook",
  website: "Website", referral: "Referral", other: "Other",
};
const LEAD_STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-600",
  contacted: "bg-yellow-50 text-yellow-600",
  qualified: "bg-purple-50 text-purple-600",
  converted: "bg-green-50 text-green-600",
  lost: "bg-gray-100 text-gray-500",
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; tab?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isStaff(role)) redirect("/admin/login");

  const { page = "1", search = "", tab = "clients" } = await searchParams;
  const pageSize = 20;
  const skip = (parseInt(page) - 1) * pageSize;

  const clientRole = await db.role.findFirst({ where: { name: "user" } });

  const searchFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [clients, clientsTotal, leads, leadsTotal, pendingLeadsCount] =
    await Promise.all([
      db.user.findMany({
        where: { roleId: clientRole?.id, ...searchFilter },
        include: { _count: { select: { services: true, invoices: true, tickets: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.user.count({ where: { roleId: clientRole?.id, ...searchFilter } }),
      db.lead.findMany({
        where: {
          status: { not: "converted" },
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.lead.count({ where: { status: { not: "converted" } } }),
      db.lead.count({ where: { status: { in: ["new", "contacted", "qualified"] } } }),
    ]);

  const totalPages = Math.ceil(
    (tab === "leads" ? leadsTotal : clientsTotal) / pageSize
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientsTotal} clients · {leadsTotal} active leads
          </p>
        </div>
        <Link href="/admin/clients/new">
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />Add Client
          </Button>
        </Link>
      </div>

      {/* Pending leads notification */}
      {pendingLeadsCount > 0 && tab === "clients" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 shrink-0">
            <UserPlus className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <p className="text-sm text-orange-700 flex-1">
            <span className="font-semibold">{pendingLeadsCount} {pendingLeadsCount === 1 ? "lead" : "leads"}</span> waiting to be reviewed and accepted as clients.
          </p>
          <Link href="?tab=leads">
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-100 gap-1 h-7 text-xs">
              Review <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* Tab switcher + search */}
      <ClientsTabSwitcher activeTab={tab} search={search} />

      {/* Clients tab */}
      {tab === "clients" && (
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />All Clients ({clientsTotal})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {clients.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{search ? "No clients match your search" : "No clients yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-4 py-3 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-sm font-semibold shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{client.name}</p>
                      <p className="text-xs text-gray-400 truncate">{client.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 shrink-0">
                      <span>{client._count.services} services</span>
                      <span>{client._count.invoices} invoices</span>
                      <span>{client._count.tickets} tickets</span>
                      <span>{formatDate(client.createdAt)}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" asChild>
                      <Link href={`/admin/clients/${client.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leads tab */}
      {tab === "leads" && (
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-gray-400" />Leads Pipeline ({leadsTotal})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {leads.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active leads</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600 text-sm font-semibold shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LEAD_STATUS_STYLES[lead.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {lead.status}
                        </span>
                        {lead.status === "new" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold animate-pulse">
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{LEAD_SOURCE_LABELS[lead.source] ?? lead.source}</span>
                      </div>
                      {lead.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{lead.notes}</p>}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs text-gray-400 hidden sm:block">{formatDate(lead.createdAt)}</span>
                      <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1" asChild>
                        <Link href={`/admin/leads/${lead.id}`}>
                          Accept <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {parseInt(page) > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`?tab=${tab}&page=${parseInt(page) - 1}${search ? `&search=${search}` : ""}`}>Previous</Link>
              </Button>
            )}
            {parseInt(page) < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`?tab=${tab}&page=${parseInt(page) + 1}${search ? `&search=${search}` : ""}`}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

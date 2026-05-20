import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { ArrowLeft, User, Server, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "User Detail — Admin" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const sessionUser = session?.user as { role?: string } | undefined;
  if (!session || !isStaff(sessionUser?.role)) redirect("/admin/login");

  const user = await db.user.findUnique({
    where: { id },
    include: {
      role: true,
      services: {
        include: { product: true, plan: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      invoices: {
        include: { currency: true, items: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      tickets: {
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) notFound();

  const roles = await db.role.findMany();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Badge
          variant={user.role?.name === "admin" ? "default" : "secondary"}
          className="ml-auto"
        >
          {user.role?.name ?? "user"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium">{user.role?.name ?? "user"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email Verified</p>
              <p className="font-medium">
                {user.emailVerifiedAt
                  ? formatDate(user.emailVerifiedAt)
                  : "Not verified"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Services ({user.services.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.services.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{s.product.name}</p>
                  <p className="text-muted-foreground">{s.plan?.name}</p>
                </div>
                <Badge
                  variant={
                    s.status === "active"
                      ? "success"
                      : s.status === "suspended"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {s.status}
                </Badge>
              </div>
            ))}
            {user.services.length === 0 && (
              <p className="text-muted-foreground text-sm">No services</p>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices ({user.invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.invoices.map((inv) => {
              const total = inv.items.reduce(
                (s, i) => s + Number(i.price) * i.quantity,
                0
              );
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">#{inv.number}</p>
                    <p className="text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {inv.currency.prefix}
                      {total.toFixed(2)}
                    </p>
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
                  </div>
                </div>
              );
            })}
            {user.invoices.length === 0 && (
              <p className="text-muted-foreground text-sm">No invoices</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

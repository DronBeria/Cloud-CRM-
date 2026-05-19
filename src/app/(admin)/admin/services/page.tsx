import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const revalidate = 30;

export const metadata: Metadata = { title: "Services — Admin" };

export default async function AdminServicesPage() {
  const session = await auth();
  const sessionUser = session?.user as { role?: string } | undefined;
  if (!session || !isStaff(sessionUser?.role)) redirect("/admin/login");

  const services = await db.service.findMany({
    include: {
      user: { select: { name: true, email: true } },
      product: true,
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">
          {services.length} total services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            All Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{s.product.name}</TableCell>
                  <TableCell>{s.plan?.name ?? "—"}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.expiresAt ? formatDate(s.expiresAt) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(s.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

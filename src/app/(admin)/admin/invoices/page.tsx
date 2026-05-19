import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const metadata: Metadata = { title: "Invoices — Admin" };

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await auth();
  const sessionUser = session?.user as { role?: string } | undefined;
  if (!session || !isStaff(sessionUser?.role)) redirect("/admin/login");

  const { page = "1", status = "" } = await searchParams;
  const pageSize = 20;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = status ? { status } : {};

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        currency: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.invoice.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">{total} total invoices</p>
      </div>

      <div className="flex gap-2">
        {["", "pending", "paid", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={s ? `?status=${s}` : "/admin/invoices"}>
              {s || "All"}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const total = inv.items.reduce(
                  (s, i) => s + Number(i.price) * i.quantity,
                  0
                );
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      #{inv.number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inv.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.user.email}
                        </p>
                      </div>
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
                    <TableCell className="text-muted-foreground text-sm">
                      {inv.dueAt ? formatDate(inv.dueAt) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(inv.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {parseInt(page) > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`?page=${parseInt(page) - 1}${status ? `&status=${status}` : ""}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {parseInt(page) < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`?page=${parseInt(page) + 1}${status ? `&status=${status}` : ""}`}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

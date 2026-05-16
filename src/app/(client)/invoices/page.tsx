import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoices = await db.invoice.findMany({
    where: { userId: session.user.id },
    include: {
      currency: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const invoicesWithTotal = invoices.map((inv) => ({
    ...inv,
    total: inv.items.reduce(
      (s, item) => s + Number(item.price) * item.quantity,
      0
    ),
    currency: {
      prefix: inv.currency.prefix,
      suffix: inv.currency.suffix,
    },
  }));

  const pending = invoicesWithTotal.filter((i) => i.status === "pending");
  const paid = invoicesWithTotal.filter((i) => i.status === "paid");
  const cancelled = invoicesWithTotal.filter((i) => i.status === "cancelled");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">
          Manage your billing and payment history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {pending.length}
          </p>
          <p className="text-sm text-muted-foreground">
            ${pending.reduce((s, i) => s + i.total, 0).toFixed(2)} due
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {paid.length}
          </p>
          <p className="text-sm text-muted-foreground">
            ${paid.reduce((s, i) => s + i.total, 0).toFixed(2)} paid
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {cancelled.length}
          </p>
          <p className="text-sm text-muted-foreground">Total cancelled</p>
        </div>
      </div>

      {invoicesWithTotal.length > 0 ? (
        <div className="space-y-3">
          {invoicesWithTotal.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium">No invoices yet</h3>
          <p className="text-sm mt-1">
            Your invoices will appear here once you&apos;ve placed an order.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

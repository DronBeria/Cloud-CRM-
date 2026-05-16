import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  CreditCard,
  FileText,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where: { id } });
  return { title: invoice ? `Invoice #${invoice.number}` : "Invoice Not Found" };
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  paid: "success",
  pending: "info",
  cancelled: "destructive",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      currency: true,
      items: true,
      transactions: {
        include: { gateway: true },
        orderBy: { createdAt: "desc" },
      },
      user: { select: { name: true, email: true } },
    },
  });

  if (!invoice || invoice.userId !== session.user.id) {
    notFound();
  }

  const subtotal = invoice.items.reduce(
    (s, item) => s + Number(item.price) * item.quantity,
    0
  );
  const paid = invoice.transactions
    .filter((t) => t.status === "succeeded")
    .reduce((s, t) => s + Number(t.amount), 0);

  const prefix = invoice.currency.prefix;
  const suffix = invoice.currency.suffix;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Invoice #{invoice.number}</h1>
          <p className="text-muted-foreground">
            Created {formatDate(invoice.createdAt)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={statusVariant[invoice.status] ?? "outline"} className="text-sm px-3 py-1">
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Bill To</p>
                  <p className="font-medium mt-1">{invoice.user.name}</p>
                  <p className="text-muted-foreground">{invoice.user.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice Number</p>
                  <p className="font-medium mt-1">#{invoice.number}</p>
                  {invoice.dueAt && (
                    <>
                      <p className="text-muted-foreground mt-2">Due Date</p>
                      <p className="font-medium">{formatDate(invoice.dueAt)}</p>
                    </>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center w-24">Qty</TableHead>
                    <TableHead className="text-right w-32">Unit Price</TableHead>
                    <TableHead className="text-right w-32">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.price), prefix, suffix)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(item.price) * item.quantity, prefix, suffix)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(subtotal, prefix, suffix)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>

            {invoice.status === "pending" && (
              <CardFooter className="gap-3">
                <Button className="flex-1" asChild>
                  <Link href={`/api/invoices/${invoice.id}/pay`}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay {formatCurrency(subtotal - paid, prefix, suffix)}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`/api/invoices/${invoice.id}/pdf`} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
              </CardFooter>
            )}

            {invoice.status === "paid" && (
              <CardFooter>
                <Button variant="outline" asChild>
                  <a href={`/api/invoices/${invoice.id}/pdf`} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Payment Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal, prefix, suffix)}</span>
              </div>
              {paid > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Paid</span>
                  <span>-{formatCurrency(paid, prefix, suffix)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Balance Due</span>
                <span className="text-lg">
                  {formatCurrency(subtotal - paid, prefix, suffix)}
                </span>
              </div>
            </CardContent>
          </Card>

          {invoice.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">
                        {tx.gateway?.name ?? "Credit"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(Number(tx.amount), prefix, suffix)}
                      </p>
                      <Badge
                        variant={
                          tx.status === "succeeded"
                            ? "success"
                            : tx.status === "failed"
                            ? "destructive"
                            : "warning"
                        }
                        className="text-xs"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

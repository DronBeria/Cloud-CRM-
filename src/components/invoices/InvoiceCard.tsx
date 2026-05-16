import Link from "next/link";
import { FileText, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";

interface InvoiceCardProps {
  invoice: {
    id: string;
    number: number;
    status: string;
    dueAt: Date | null;
    createdAt: Date;
    currencyCode: string;
    total: number;
    currency?: { prefix: string; suffix: string };
  };
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  paid: "success",
  pending: "info",
  cancelled: "destructive",
};

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const prefix = invoice.currency?.prefix ?? "$";
  const suffix = invoice.currency?.suffix ?? "";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <Link
                href={`/invoices/${invoice.id}`}
                className="font-semibold hover:text-primary transition-colors"
              >
                Invoice #{invoice.number}
              </Link>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDate(invoice.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge variant={statusVariant[invoice.status] ?? "outline"}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
            <span className="text-lg font-bold">
              {formatCurrency(invoice.total, prefix, suffix)}
            </span>
          </div>
        </div>

        {invoice.dueAt && invoice.status === "pending" && (
          <div className="mt-3 flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Due {formatDate(invoice.dueAt)}</span>
            </div>
            <Button size="sm" asChild>
              <Link href={`/invoices/${invoice.id}`}>Pay Now</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

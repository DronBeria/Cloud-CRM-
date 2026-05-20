"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Invoice { id: string; invoiceNumber: string; total: number; totalInr: number; }

export function QuickPayButton({ invoices }: { invoices: Invoice[] }) {
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const router = useRouter();

  const payWithCredits = async (invoiceId: string) => {
    setPaying(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });
      const data = await res.json();
      if (data.method === "credits") {
        toast.success("Paid with credits!");
        setOpen(false);
        router.refresh();
      } else if (data.requiresPayment) {
        toast.info("Redirecting to payment gateway...");
        setOpen(false);
      }
    } catch {
      toast.error("Payment failed. Try again.");
    } finally {
      setPaying(null);
    }
  };

  if (invoices.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5 shrink-0"
        onClick={() => setOpen(true)}
      >
        <CreditCard className="h-3.5 w-3.5" />Pay Now
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-red-500" />Pay Invoices
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">₹{inv.totalInr.toLocaleString("en-IN")}</p>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 shrink-0"
                  onClick={() => payWithCredits(inv.id)}
                  disabled={paying === inv.id}
                >
                  {paying === inv.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : "Pay"}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">
            Credits will be applied automatically. Contact support for other payment methods.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

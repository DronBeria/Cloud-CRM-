"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";

interface Renewal {
  id: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  planName: string;
  amount: number;
  daysLeft: number;
  expiresAt: string;
  hasInvoice: boolean;
}

interface Props { items: Renewal[]; }

export function RenewalsList({ items }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? items : items.slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <Clock className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">No renewals due in the next 30 days</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {displayed.map((r) => {
        const isExpanded = expanded === r.id;
        const urgency = r.daysLeft <= 3 ? "destructive" : r.daysLeft <= 7 ? "warning" : "secondary";

        return (
          <div key={r.id} className="rounded-lg border border-gray-100 overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpanded(isExpanded ? null : r.id)}
            >
              <div className="shrink-0">
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.clientName}</p>
                <p className="text-xs text-gray-400 truncate">{r.serviceName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm font-semibold text-gray-800">
                  ₹{r.amount.toLocaleString("en-IN")}
                </p>
                <Badge variant={urgency} className="text-[10px] h-5 px-1.5">
                  {r.daysLeft === 0 ? "Today" : `${r.daysLeft}d`}
                </Badge>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 pt-1 bg-gray-50/50 border-t border-gray-100 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Client</p>
                    <p className="font-medium text-gray-700">{r.clientEmail}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Plan</p>
                    <p className="font-medium text-gray-700">{r.planName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Expires</p>
                    <p className="font-medium text-gray-700">
                      {format(new Date(r.expiresAt), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Amount due</p>
                    <p className="font-semibold text-gray-900">₹{r.amount.toLocaleString("en-IN")}</p>
                  </div>
                </div>
                {r.daysLeft <= 3 && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Renewal overdue or expiring very soon
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-6 text-xs" asChild>
                    <Link href={`/admin/clients`}>View Client</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs" asChild>
                    <Link href={`/admin/services`}>View Service</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {items.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          {showAll ? "Show less" : `Show ${items.length - 5} more renewals`}
        </button>
      )}
    </div>
  );
}

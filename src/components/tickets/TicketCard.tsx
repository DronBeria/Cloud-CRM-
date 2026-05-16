import Link from "next/link";
import { MessageSquare, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface TicketCardProps {
  ticket: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
    _count?: { messages: number };
  };
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  open: "info",
  replied: "default",
  closed: "secondary",
};

const priorityColor: Record<string, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-blue-600 dark:text-blue-400",
  high: "text-orange-600 dark:text-orange-400",
  urgent: "text-red-600 dark:text-red-400",
};

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <Link
                href={`/tickets/${ticket.id}`}
                className="font-semibold hover:text-primary transition-colors line-clamp-1"
              >
                {ticket.subject}
              </Link>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDateTime(ticket.updatedAt)}</span>
                {ticket._count?.messages != null && (
                  <>
                    <span>·</span>
                    <span>{ticket._count.messages} message{ticket._count.messages !== 1 ? "s" : ""}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge variant={statusVariant[ticket.status] ?? "outline"}>
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </Badge>
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                priorityColor[ticket.priority] ?? "text-muted-foreground"
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

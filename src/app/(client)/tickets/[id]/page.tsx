"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageSquare,
  User,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  messages: Array<{
    id: string;
    message: string;
    createdAt: string;
    user: { id: string; name: string; role?: { name: string } | null };
  }>;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  open: "info",
  replied: "default",
  closed: "secondary",
};

export default function TicketDetailPage() {
  const params = useParams();
  // session removed
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch ticket");
      const data = await res.json();
      setTicket(data);
    } catch {
      toast.error("Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/tickets/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setMessage("");
      await fetchTicket();
      toast.success("Message sent!");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button className="mt-4" asChild>
          <Link href="/tickets">Back to Tickets</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold line-clamp-1">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusVariant[ticket.status] ?? "outline"}>
              {ticket.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {ticket.priority} priority
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {ticket.messages.map((msg) => {
          const isStaff = msg.user.role?.name === "admin";
          const isOwn = msg.user.id === null?.id;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isStaff ? "" : "flex-row-reverse"}`}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback
                  className={
                    isStaff
                      ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                      : "bg-primary/10 text-primary"
                  }
                >
                  {isStaff ? (
                    <Shield className="h-4 w-4" />
                  ) : (
                    msg.user.name[0].toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={`flex-1 max-w-[85%] ${isStaff ? "" : "items-end flex flex-col"}`}
              >
                <div
                  className={`flex items-center gap-2 mb-1 ${isStaff ? "" : "flex-row-reverse"}`}
                >
                  <span className="text-sm font-medium">{msg.user.name}</span>
                  {isStaff && (
                    <Badge variant="outline" className="text-xs">
                      Staff
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
                <div
                  className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                    isStaff
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {ticket.status !== "closed" && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Type your reply..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) sendMessage();
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Press Ctrl+Enter to send
                </p>
                <Button onClick={sendMessage} disabled={isSending || !message.trim()}>
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {ticket.status === "closed" && (
        <div className="text-center py-6 border rounded-lg text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>This ticket is closed.</p>
        </div>
      )}
    </div>
  );
}

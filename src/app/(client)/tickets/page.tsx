import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MessageSquare, Plus } from "lucide-react";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Support Tickets" };

export default async function TicketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await db.ticket.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const open = tickets.filter((t) => t.status !== "closed");
  const closed = tickets.filter((t) => t.status === "closed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Get help from our support team
          </p>
        </div>
        <Button asChild>
          <Link href="/tickets/create">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Open Tickets</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {open.length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Closed Tickets</p>
          <p className="text-2xl font-bold text-muted-foreground">
            {closed.length}
          </p>
        </div>
      </div>

      {tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium">No support tickets</h3>
          <p className="text-sm mt-1">
            Need help? Open a ticket and our team will assist you.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/tickets/create">Open a Ticket</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

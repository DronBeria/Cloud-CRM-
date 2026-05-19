import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
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

export const revalidate = 30;

export const metadata: Metadata = { title: "Tickets — Admin" };

export default async function AdminTicketsPage() {
  const session = await auth();
  const sessionUser = session?.user as { role?: string } | undefined;
  if (!session || !isStaff(sessionUser?.role)) redirect("/admin/login");

  const tickets = await db.ticket.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">
          {tickets.length} total tickets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            All Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <span className="line-clamp-1">{ticket.subject}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ticket.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ticket.priority === "urgent"
                          ? "destructive"
                          : ticket.priority === "high"
                          ? "warning"
                          : ticket.priority === "medium"
                          ? "info"
                          : "secondary"
                      }
                    >
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ticket.status === "open"
                          ? "info"
                          : ticket.status === "replied"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{ticket._count.messages}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(ticket.updatedAt)}
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

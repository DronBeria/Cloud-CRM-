"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, UserPlus, CheckCircle, MessageSquare, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  number: number;
  clientName: string;
  total: number;
}

interface OpenTicket {
  id: string;
  subject: string;
  clientName: string;
  status: string;
}

type Modal = "invoice" | "client" | "pay" | "ticket" | null;

export function QuickActions() {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [loading, setLoading] = useState(false);

  // Add client form
  const [clientForm, setClientForm] = useState({ name: "", email: "", password: "" });

  // Mark paid
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Reply ticket
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState("");
  const [ticketReply, setTicketReply] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(false);

  const openModal = async (m: Modal) => {
    setModal(m);
    if (m === "pay") {
      setLoadingInvoices(true);
      try {
        const res = await fetch("/api/admin/invoices?status=pending&pageSize=20");
        const data = await res.json();
        setPendingInvoices(
          (data.invoices ?? []).map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber ?? `#${inv.number}`,
            number: inv.number,
            clientName: inv.user?.name ?? "Unknown",
            total: (inv.items ?? []).reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0),
          }))
        );
      } catch { toast.error("Failed to load invoices"); }
      finally { setLoadingInvoices(false); }
    }
    if (m === "ticket") {
      setLoadingTickets(true);
      try {
        const res = await fetch("/api/admin/tickets?status=open&pageSize=20");
        const data = await res.json();
        setOpenTickets(data.tickets ?? data ?? []);
      } catch { toast.error("Failed to load tickets"); }
      finally { setLoadingTickets(false); }
    }
  };

  const addClient = async () => {
    if (!clientForm.name || !clientForm.email || !clientForm.password) {
      toast.error("Name, email and password are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Client ${clientForm.name} created`);
      setModal(null);
      setClientForm({ name: "", email: "", password: "" });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  const markPaid = async () => {
    if (!selectedInvoice) { toast.error("Select an invoice"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${selectedInvoice}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice marked as paid");
      setModal(null);
      setSelectedInvoice("");
      router.refresh();
    } catch { toast.error("Failed to mark invoice as paid"); }
    finally { setLoading(false); }
  };

  const replyTicket = async () => {
    if (!selectedTicket || !ticketReply.trim()) { toast.error("Select a ticket and write a reply"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: ticketReply }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Reply sent");
      setModal(null);
      setTicketReply("");
      setSelectedTicket("");
    } catch { toast.error("Failed to send reply"); }
    finally { setLoading(false); }
  };

  const ACTIONS = [
    { icon: UserPlus, label: "Add Client", modal: "client" as Modal, color: "text-blue-600", bg: "bg-blue-50" },
    { icon: CheckCircle, label: "Mark Paid", modal: "pay" as Modal, color: "text-green-600", bg: "bg-green-50" },
    { icon: MessageSquare, label: "Reply Ticket", modal: "ticket" as Modal, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <>
      <div className="flex items-center gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => openModal(a.modal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${a.bg} ${a.color} text-sm font-medium hover:opacity-80 transition-opacity`}
            >
              <Icon className="h-3.5 w-3.5" />
              {a.label}
            </button>
          );
        })}
        <Button size="sm" className="h-8 gap-1.5" asChild>
          <a href="/admin/invoices/new">
            <Plus className="h-3.5 w-3.5" />New Invoice
          </a>
        </Button>
      </div>

      {/* Add Client Modal */}
      <Dialog open={modal === "client"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-500" />Add Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input placeholder="John Smith" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="john@example.com" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temporary Password</Label>
              <Input type="password" placeholder="Min 8 characters" value={clientForm.password} onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button size="sm" onClick={addClient} disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Modal */}
      <Dialog open={modal === "pay"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />Mark Invoice as Paid
            </DialogTitle>
          </DialogHeader>
          {loadingInvoices ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : pendingInvoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No pending invoices</p>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Select Invoice</Label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {pendingInvoices.map((inv) => (
                  <label key={inv.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedInvoice === inv.id ? "border-primary bg-primary/5" : "border-gray-100 hover:bg-gray-50"}`}>
                    <input type="radio" name="invoice" value={inv.id} checked={selectedInvoice === inv.id} onChange={() => setSelectedInvoice(inv.id)} className="text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{inv.invoiceNumber} — {inv.clientName}</p>
                      <p className="text-xs text-gray-400">₹{inv.total.toLocaleString("en-IN")}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button size="sm" onClick={markPaid} disabled={loading || !selectedInvoice} className="bg-green-600 hover:bg-green-700">
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Ticket Modal */}
      <Dialog open={modal === "ticket"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-500" />Reply to Ticket
            </DialogTitle>
          </DialogHeader>
          {loadingTickets ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : openTickets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No open tickets</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Ticket</Label>
                <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a ticket..." /></SelectTrigger>
                  <SelectContent>
                    {openTickets.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.subject} — {t.user?.name ?? t.clientName ?? "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Your Reply</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  rows={4}
                  placeholder="Type your reply..."
                  value={ticketReply}
                  onChange={(e) => setTicketReply(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button size="sm" onClick={replyTicket} disabled={loading || !selectedTicket || !ticketReply.trim()}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

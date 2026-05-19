"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  LayoutDashboard, FileText, Server, MessageSquare, StickyNote,
  Plus, RefreshCw, Pause, Play, Trash2, Eye, EyeOff, Copy,
  ExternalLink, Loader2, IndianRupee, Send, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, Clock, Globe, Phone, Building, MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientData {
  id: string; name: string; email: string; phone?: string | null;
  city?: string | null; state?: string | null; country?: string | null;
  companyName?: string | null; address?: string | null; postcode?: string | null;
  createdAt: string; emailVerifiedAt?: string; role: string;
}

interface InvoiceData {
  id: string; invoiceNumber: string; number: number; status: string;
  total: number; totalInr: number; paid: number; remaining: number;
  currencyPrefix: string; currencySuffix: string;
  dueAt?: string; paidAt?: string; createdAt: string; itemCount: number;
}

interface TsplusData {
  username: string; password: string; launchUrl: string; serverUrl: string;
  dataPath: string; tallyPath: string; provisionedAt: string;
}

interface ServiceData {
  id: string; productName: string; categoryName?: string; planName?: string;
  status: string; priceInr: number; expiresAt?: string; createdAt: string;
  hasCancellation: boolean; cancellationType?: string; tsplus: TsplusData | null;
}

interface TicketMessage {
  id: string; message: string; isStaff: boolean; authorName: string;
  authorRole: string; createdAt: string;
}

interface TicketData {
  id: string; subject: string; status: string; priority: string;
  department: string; createdAt: string; updatedAt: string;
  messageCount: number; messages: TicketMessage[];
}

interface NoteData { id: string; note: string; createdAt: string; }

interface Props {
  client: ClientData;
  invoices: InvoiceData[];
  services: ServiceData[];
  tickets: TicketData[];
  notes: NoteData[];
  staffId: string;
  creditBalance: number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  replied: "bg-violet-50 text-violet-700 border-violet-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize", STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
    {status}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export function ClientDetailTabs({ client, invoices, services, tickets, notes: initialNotes, staffId, creditBalance }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "tally" | "invoices" | "support" | "notes">("overview");
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [loading, setLoading] = useState<string | null>(null);

  // Modals
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [addCreditOpen, setAddCreditOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ description: "", amount: "", dueAt: "" });
  const [creditAmount, setCreditAmount] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showPassFor, setShowPassFor] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "tally", label: "Tally / RDP", icon: Globe },
    { id: "invoices", label: "Invoices", icon: FileText, count: invoices.filter(i => i.status === "pending").length },
    { id: "support", label: "Support", icon: MessageSquare, count: tickets.filter(t => t.status !== "closed").length },
    { id: "notes", label: "Notes", icon: StickyNote, count: notes.length },
  ] as const;

  const tsplusServices = services.filter((s) => s.tsplus);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createInvoice = async () => {
    if (!invoiceForm.description || !invoiceForm.amount) { toast.error("Fill required fields"); return; }
    setLoading("invoice");
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: client.id,
          currencyCode: "INR",
          dueAt: invoiceForm.dueAt || undefined,
          items: [{ description: invoiceForm.description, price: parseFloat(invoiceForm.amount), quantity: 1 }],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice created");
      setCreateInvoiceOpen(false);
      setInvoiceForm({ description: "", amount: "", dueAt: "" });
      router.refresh();
    } catch { toast.error("Failed to create invoice"); }
    finally { setLoading(null); }
  };

  const addCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading("credit");
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currencyCode: "INR" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`₹${amount} credit added`);
      setAddCreditOpen(false);
      setCreditAmount("");
      router.refresh();
    } catch { toast.error("Failed to add credit"); }
    finally { setLoading(null); }
  };

  const toggleService = async (service: ServiceData) => {
    const action = service.status === "suspended" ? "reactivate" : "suspend";
    setLoading(`service-${service.id}`);
    try {
      const res = await fetch(`/api/admin/services/${service.id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`Service ${action === "reactivate" ? "reactivated" : "suspended"}`);
      router.refresh();
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  const resetTsplusPassword = async (serviceId: string) => {
    setLoading(`reset-${serviceId}`);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/tsplus/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`New password: ${data.password}`, { duration: 10000 });
      router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(null); }
  };

  const markInvoicePaid = async (invoiceId: string) => {
    setLoading(`pay-${invoiceId}`);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Invoice marked as paid");
      router.refresh();
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setLoading("note");
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText, staffId }),
      });
      const note = await res.json();
      setNotes([note, ...notes]);
      setNoteText("");
      toast.success("Note added");
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/admin/clients/${client.id}/notes/${noteId}`, { method: "DELETE" });
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch { toast.error("Failed to delete note"); }
  };

  const sendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setLoading(`reply-${ticketId}`);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (!res.ok) throw new Error();
      toast.success("Reply sent");
      setReplyText("");
      setReplyingTo(null);
      router.refresh();
    } catch { toast.error("Failed to send reply"); }
    finally { setLoading(null); }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success(`${label} copied`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Tab bar + quick actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative",
                  tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {"count" in t && t.count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-white text-[9px] font-bold">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setCreateInvoiceOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Invoice
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setAddCreditOpen(true)}>
            <IndianRupee className="h-3.5 w-3.5" />Add Credit
          </Button>
        </div>
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-600">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {[
                  { icon: Globe, v: client.email },
                  client.phone && { icon: Phone, v: client.phone },
                  client.companyName && { icon: Building, v: client.companyName },
                  (client.city || client.country) && { icon: MapPin, v: [client.city, client.state, client.country].filter(Boolean).join(", ") },
                ].filter(Boolean).map((item: any, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-700">{item.v}</span>
                    </div>
                  );
                })}
                <Separator />
                <div className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Joined {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                </div>
                {creditBalance > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Credits</span>
                    <span className="font-semibold text-emerald-600">₹{creditBalance.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* Recent services */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-400" />Services
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y divide-gray-50">
                {services.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">No services</p> :
                  services.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{s.productName}</p>
                        <p className="text-xs text-gray-400">{s.planName} · {s.expiresAt ? `Renews ${format(new Date(s.expiresAt), "dd MMM yyyy")}` : "No expiry"}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">₹{s.priceInr.toLocaleString("en-IN")}</p>
                      <StatusBadge status={s.status} />
                      <button onClick={() => toggleService(s)} disabled={loading === `service-${s.id}`} className="text-gray-400 hover:text-gray-600">
                        {loading === `service-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                          s.status === "suspended" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))
                }
              </CardContent>
            </Card>

            {/* Recent invoices */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />Recent Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y divide-gray-50">
                {invoices.slice(0, 4).map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-400">{format(new Date(inv.createdAt), "dd MMM yyyy")}</p>
                    </div>
                    <p className="text-sm font-semibold">₹{inv.totalInr.toLocaleString("en-IN")}</p>
                    <StatusBadge status={inv.status} />
                    {inv.status === "pending" && (
                      <button onClick={() => markInvoicePaid(inv.id)} disabled={loading === `pay-${inv.id}`} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">
                        {loading === `pay-${inv.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                      </button>
                    )}
                  </div>
                ))}
                {invoices.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">No invoices</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tally / RDP Tab ── */}
      {tab === "tally" && (
        <div className="space-y-4">
          {tsplusServices.length === 0 ? (
            <Card className="border-gray-100">
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-500">No TSplus services provisioned for this client</p>
                <p className="text-xs text-gray-400 mt-1">When a Tally/RDP plan is purchased and paid, the account will be auto-provisioned here.</p>
              </CardContent>
            </Card>
          ) : (
            tsplusServices.map((s) => (
              <Card key={s.id} className="border-violet-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      🖥️ {s.productName} — {s.planName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} />
                      <button
                        onClick={() => toggleService(s)}
                        disabled={loading === `service-${s.id}`}
                        className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
                          s.status === "suspended"
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        )}
                      >
                        {loading === `service-${s.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> :
                          s.status === "suspended" ? <><Play className="h-3 w-3" />Reactivate</> : <><Pause className="h-3 w-3" />Suspend</>}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <p className="text-xs text-gray-400 font-medium">Username</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-800">{s.tsplus!.username}</code>
                        <button onClick={() => copy(s.tsplus!.username, "Username")} className="text-gray-400 hover:text-gray-600">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <p className="text-xs text-gray-400 font-medium">Password</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-800">
                          {showPassFor === s.id ? s.tsplus!.password : "••••••••••••"}
                        </code>
                        <button onClick={() => setShowPassFor(showPassFor === s.id ? null : s.id)} className="text-gray-400 hover:text-gray-600">
                          {showPassFor === s.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        {showPassFor === s.id && (
                          <button onClick={() => copy(s.tsplus!.password, "Password")} className="text-gray-400 hover:text-gray-600">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <p className="text-xs text-gray-400 font-medium">Data Path</p>
                      <code className="text-xs font-mono text-gray-600 break-all">{s.tsplus!.dataPath}</code>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <p className="text-xs text-gray-400 font-medium">Tally Path</p>
                      <code className="text-xs font-mono text-gray-600 break-all">{s.tsplus!.tallyPath}</code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={s.tsplus!.launchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />Launch Tally (as admin)
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8"
                      onClick={() => resetTsplusPassword(s.id)}
                      disabled={loading === `reset-${s.id}`}
                    >
                      {loading === `reset-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Reset Password
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => copy(s.tsplus!.launchUrl, "Launch URL")}>
                      <Copy className="h-3.5 w-3.5" />Copy Launch URL
                    </Button>
                  </div>

                  {s.tsplus?.provisionedAt && (
                    <p className="text-xs text-gray-400">
                      Provisioned {formatDistanceToNow(new Date(s.tsplus.provisionedAt), { addSuffix: true })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Invoices Tab ── */}
      {tab === "invoices" && (
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">All Invoices ({invoices.length})</CardTitle>
              <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setCreateInvoiceOpen(true)}>
                <Plus className="h-3.5 w-3.5" />New Invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No invoices yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{inv.invoiceNumber}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                        <span>{format(new Date(inv.createdAt), "dd MMM yyyy")}</span>
                        {inv.dueAt && <span>Due {format(new Date(inv.dueAt), "dd MMM yyyy")}</span>}
                        <span>{inv.itemCount} item{inv.itemCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">₹{inv.totalInr.toLocaleString("en-IN")}</p>
                      {inv.status === "pending" && inv.remaining > 0 && (
                        <p className="text-xs text-red-500">₹{inv.remaining.toFixed(2)} due</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                        <a href={`/admin/invoices`}>View</a>
                      </Button>
                      {inv.status === "pending" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => markInvoicePaid(inv.id)}
                          disabled={loading === `pay-${inv.id}`}
                        >
                          {loading === `pay-${inv.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Support Tab ── */}
      {tab === "support" && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <Card className="border-gray-100">
              <CardContent className="py-10 text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-500">No support tickets from this client</p>
              </CardContent>
            </Card>
          ) : tickets.map((ticket) => (
            <Card key={ticket.id} className="border-gray-100">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{ticket.subject}</p>
                    <StatusBadge status={ticket.status} />
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize",
                      ticket.priority === "high" ? "bg-red-50 text-red-600 border-red-200" :
                      ticket.priority === "medium" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                      "bg-gray-50 text-gray-500 border-gray-200"
                    )}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ticket.department} · {ticket.messageCount} messages · Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                {expandedTicket === ticket.id ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </div>

              {expandedTicket === ticket.id && (
                <div className="border-t border-gray-100">
                  {/* Messages */}
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto bg-gray-50/50">
                    {ticket.messages.map((msg) => (
                      <div key={msg.id} className={cn("flex", msg.isStaff ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm",
                          msg.isStaff ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-800"
                        )}>
                          <p className={cn("text-[10px] font-semibold mb-1", msg.isStaff ? "text-indigo-200" : "text-gray-500")}>
                            {msg.authorName} · {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply */}
                  <div className="p-3 border-t border-gray-100 flex gap-2">
                    <Textarea
                      placeholder="Type a reply..."
                      value={replyingTo === ticket.id ? replyText : ""}
                      onChange={(e) => { setReplyingTo(ticket.id); setReplyText(e.target.value); }}
                      className="text-sm resize-none min-h-0 h-9 py-2"
                      rows={1}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => sendReply(ticket.id)}
                      disabled={loading === `reply-${ticket.id}` || !replyText.trim()}
                    >
                      {loading === `reply-${ticket.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Notes Tab ── */}
      {tab === "notes" && (
        <div className="space-y-4">
          <Card className="border-gray-100">
            <CardContent className="pt-4 flex gap-3">
              <Textarea
                placeholder="Add a private note about this client... (only staff can see this)"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
              <Button onClick={addNote} disabled={!noteText.trim() || loading === "note"} className="self-start shrink-0">
                {loading === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>

          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notes yet. Add context about this client.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="flex items-start gap-3 p-4 bg-yellow-50/60 border border-yellow-100 rounded-xl">
                  <StickyNote className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Invoice Modal ── */}
      <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />New Invoice for {client.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input placeholder="e.g. Tally Cloud - March 2025" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" placeholder="0.00" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date (optional)</Label>
              <Input type="date" value={invoiceForm.dueAt} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueAt: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateInvoiceOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={createInvoice} disabled={loading === "invoice"}>
              {loading === "invoice" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Credit Modal ── */}
      <Dialog open={addCreditOpen} onOpenChange={setAddCreditOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-500" />Add Credit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">Current balance: <span className="font-semibold text-gray-800">₹{creditBalance.toFixed(2)}</span></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" placeholder="e.g. 500" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddCreditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={addCredit} disabled={loading === "credit"} className="bg-emerald-600 hover:bg-emerald-700">
              {loading === "credit" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Add Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

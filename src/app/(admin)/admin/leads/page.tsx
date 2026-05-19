"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UserPlus, Search, Plus, MoreHorizontal, ArrowRight, Mail,
  Loader2, Phone, Globe, Trash2, Edit, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/utils";

const STATUSES = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-400" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "qualified", label: "Qualified", color: "bg-purple-500/20 text-purple-400" },
  { value: "converted", label: "Converted", color: "bg-green-500/20 text-green-400" },
  { value: "lost", label: "Lost", color: "bg-red-500/20 text-red-400" },
];

const SOURCES = [
  { value: "google_ads", label: "Google Ads" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  notes?: string;
  assignedTo?: string;
  convertedAt?: string;
  clientId?: string;
  createdAt: string;
}

const emptyForm = {
  name: "", email: "", phone: "", source: "website",
  notes: "", status: "new", assignedTo: "",
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Convert form state
  const [convertMethod, setConvertMethod] = useState<"create" | "invite">("create");
  const [convertPassword, setConvertPassword] = useState("");
  const [convertSendEmail, setConvertSendEmail] = useState(true);
  const [converting, setConverting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({
      name: lead.name, email: lead.email, phone: lead.phone ?? "",
      source: lead.source, notes: lead.notes ?? "", status: lead.status,
      assignedTo: lead.assignedTo ?? "",
    });
  };

  const saveLead = async () => {
    setSaving(true);
    try {
      const isEdit = !!editLead;
      const url = isEdit ? `/api/admin/leads/${editLead.id}` : "/api/admin/leads";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? "Lead updated" : "Lead created");
      setCreateOpen(false);
      setEditLead(null);
      fetchLeads();
    } catch {
      toast.error("Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async (lead: Lead) => {
    if (!confirm(`Delete lead "${lead.name}"?`)) return;
    try {
      await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
      toast.success("Lead deleted");
      fetchLeads();
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const updateStatus = async (lead: Lead, status: string) => {
    try {
      await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status } : l));
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleConvert = async () => {
    if (!convertLead) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/leads/${convertLead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: convertMethod,
          password: convertMethod === "create" && convertPassword ? convertPassword : undefined,
          sendEmail: convertSendEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      if (convertMethod === "invite") {
        toast.success("Invite sent! Lead will register via email link.");
        if (data.inviteUrl) {
          await navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
          toast.info("Invite link copied to clipboard");
        }
      } else {
        toast.success("Client account created and email sent!");
      }

      setConvertLead(null);
      fetchLeads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  const statusInfo = (status: string) =>
    STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  const sourceLabel = (source: string) =>
    SOURCES.find((s) => s.value === source)?.label ?? source;

  // Counts by status for pipeline
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = leads.filter((l) => l.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground mt-1">{total} total leads</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Add Lead
        </Button>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-5 gap-3">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "" : s.value)}
            className={`p-3 rounded-lg border text-left transition-all ${
              statusFilter === s.value ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50"
            }`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-0.5">{counts[s.value] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {statusFilter && (
          <Button variant="outline" size="sm" onClick={() => setStatusFilter("")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Leads table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />Lead Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No leads yet. Add your first lead to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => {
                const st = statusInfo(lead.status);
                return (
                  <div
                    key={lead.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{lead.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />{lead.email}
                        </span>
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{lead.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />{sourceLabel(lead.source)}
                        </span>
                        <span>{formatDate(lead.createdAt)}</span>
                      </div>
                      {lead.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                          {lead.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {lead.status !== "converted" && lead.status !== "lost" && (
                        <Select
                          value={lead.status}
                          onValueChange={(v) => updateStatus(lead, v)}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.filter((s) => s.value !== "converted").map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {lead.status === "converted" && (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />Converted
                        </Badge>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(lead)}>
                            <Edit className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          {lead.status !== "converted" && (
                            <DropdownMenuItem onClick={() => setConvertLead(lead)}>
                              <ArrowRight className="mr-2 h-4 w-4 text-green-500" />
                              Convert to Client
                            </DropdownMenuItem>
                          )}
                          {lead.clientId && (
                            <DropdownMenuItem asChild>
                              <a href={`/admin/users/${lead.clientId}`}>
                                <ArrowRight className="mr-2 h-4 w-4" />View Client
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteLead(lead)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen || !!editLead} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditLead(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.filter((s) => s.value !== "converted").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add notes about this lead..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditLead(null); }}>Cancel</Button>
            <Button onClick={saveLead} disabled={saving || !form.name || !form.email}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editLead ? "Save Changes" : "Add Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Client Dialog */}
      <Dialog open={!!convertLead} onOpenChange={(o) => !o && setConvertLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-green-500" />
              Convert {convertLead?.name} to Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup
              value={convertMethod}
              onValueChange={(v) => setConvertMethod(v as "create" | "invite")}
              className="space-y-2"
            >
              <div className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${convertMethod === "create" ? "border-primary" : ""}`}>
                <RadioGroupItem value="create" id="m-create" className="mt-0.5" />
                <div>
                  <Label htmlFor="m-create" className="cursor-pointer font-medium">Create Account Now</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Admin creates their account and emails them credentials.</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${convertMethod === "invite" ? "border-primary" : ""}`}>
                <RadioGroupItem value="invite" id="m-invite" className="mt-0.5" />
                <div>
                  <Label htmlFor="m-invite" className="cursor-pointer font-medium">Send Signup Link</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Send a unique invite link — they register themselves.</p>
                </div>
              </div>
            </RadioGroup>

            {convertMethod === "create" && (
              <div className="space-y-2">
                <Label>Password (optional — auto-generated if empty)</Label>
                <Input
                  type="password"
                  value={convertPassword}
                  onChange={(e) => setConvertPassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="send-email" className="text-sm">
                Send email notification
              </Label>
              <Switch id="send-email" checked={convertSendEmail} onCheckedChange={setConvertSendEmail} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertLead(null)} disabled={converting}>Cancel</Button>
            <Button onClick={handleConvert} disabled={converting} className="bg-green-600 hover:bg-green-700">
              {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convert Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

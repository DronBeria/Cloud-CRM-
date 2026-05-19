"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Zap, Plus, Play, Pause, Trash2, ChevronRight,
  Bell, FileText, Server, Mail, Loader2, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const TRIGGERS = [
  { value: "invoice_created", label: "Invoice Created", icon: FileText, color: "text-blue-500" },
  { value: "invoice_paid", label: "Invoice Paid", icon: FileText, color: "text-emerald-500" },
  { value: "invoice_overdue", label: "Invoice Overdue", icon: FileText, color: "text-red-500" },
  { value: "service_expiring", label: "Service Expiring (7 days)", icon: Server, color: "text-orange-500" },
  { value: "service_suspended", label: "Service Suspended", icon: Server, color: "text-yellow-500" },
  { value: "client_created", label: "New Client Registered", icon: Bell, color: "text-violet-500" },
  { value: "ticket_created", label: "Support Ticket Opened", icon: Bell, color: "text-indigo-500" },
];

const ACTIONS = [
  { value: "send_email", label: "Send Email to Client" },
  { value: "send_notification", label: "Create In-App Notification" },
  { value: "create_invoice", label: "Auto-Create Renewal Invoice" },
  { value: "suspend_service", label: "Suspend Service" },
  { value: "webhook", label: "Call Webhook URL" },
];

const DEFAULT_RULES = [
  {
    name: "Auto-suspend on overdue",
    description: "Suspends service when invoice is overdue by more than 2 days",
    trigger: "invoice_overdue",
    enabled: true,
    runCount: 0,
    actions: [{ type: "suspend_service", config: {} }],
    conditions: [],
  },
  {
    name: "Renewal reminder",
    description: "Emails client 7 days before service expiry",
    trigger: "service_expiring",
    enabled: true,
    runCount: 0,
    actions: [{ type: "send_email", config: { template: "renewal_reminder" } }],
    conditions: [],
  },
  {
    name: "Welcome new client",
    description: "Sends welcome email when a client registers",
    trigger: "client_created",
    enabled: true,
    runCount: 0,
    actions: [{ type: "send_email", config: { template: "welcome" } }],
    conditions: [],
  },
  {
    name: "Invoice paid notification",
    description: "Notifies admin when a payment is received",
    trigger: "invoice_paid",
    enabled: true,
    runCount: 0,
    actions: [{ type: "send_notification", config: {} }],
    conditions: [],
  },
];

interface Rule {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  enabled: boolean;
  runCount: number;
  lastRunAt?: string;
  actions: { type: string; config: Record<string, string> }[];
  conditions: unknown[];
}

export default function WorkflowsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", trigger: "", actionType: "",
  });

  useEffect(() => {
    fetch("/api/admin/workflows")
      .then((r) => r.json())
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load workflows"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (rule: Rule) => {
    try {
      await fetch(`/api/admin/workflows/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    } catch { toast.error("Failed to update"); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await fetch(`/api/admin/workflows/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Workflow deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const createRule = async () => {
    if (!form.name || !form.trigger || !form.actionType) {
      toast.error("Fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          trigger: form.trigger,
          actions: [{ type: form.actionType, config: {} }],
          conditions: [],
          enabled: true,
        }),
      });
      const rule = await res.json();
      setRules((prev) => [rule, ...prev]);
      toast.success("Workflow created");
      setCreateOpen(false);
      setForm({ name: "", description: "", trigger: "", actionType: "" });
    } catch { toast.error("Failed to create workflow"); }
    finally { setSaving(false); }
  };

  const getTrigger = (t: string) => TRIGGERS.find((tr) => tr.value === t);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500 mt-0.5">Automate billing, notifications, and service management</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />New Workflow
        </Button>
      </div>

      {/* Default rule suggestions */}
      {rules.length === 0 && !loading && (
        <Card className="border-dashed border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Suggested Workflows — click to add</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
            {DEFAULT_RULES.map((r) => {
              const trig = getTrigger(r.trigger);
              const Icon = trig?.icon ?? Zap;
              return (
                <button
                  key={r.name}
                  onClick={async () => {
                    const res = await fetch("/api/admin/workflows", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(r),
                    });
                    const rule = await res.json();
                    setRules((prev) => [rule, ...prev]);
                    toast.success(`"${r.name}" added`);
                  }}
                  className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors border border-gray-100"
                >
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${trig?.color ?? "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto mt-0.5 shrink-0" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const trig = getTrigger(rule.trigger);
            const Icon = trig?.icon ?? Zap;
            return (
              <Card key={rule.id} className={`border-gray-100 transition-opacity ${!rule.enabled ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 shrink-0">
                      <Icon className={`h-5 w-5 ${trig?.color ?? "text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {trig?.label ?? rule.trigger}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{rule.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>→ {rule.actions.map((a) => ACTIONS.find((x) => x.value === a.type)?.label ?? a.type).join(", ")}</span>
                        {rule.runCount > 0 && <span>· Ran {rule.runCount}×</span>}
                        {rule.lastRunAt && <span>· Last run {new Date(rule.lastRunAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch checked={rule.enabled} onCheckedChange={() => toggle(rule)} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-500"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />New Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Workflow Name *</Label>
              <Input placeholder="e.g. Auto-suspend overdue clients" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input placeholder="What does this workflow do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Trigger *</Label>
              <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="When should this run?" /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action *</Label>
              <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="What should happen?" /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={createRule} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

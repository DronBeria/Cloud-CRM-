"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, CheckCircle, XCircle, Upload, ExternalLink, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IntegrationConfig {
  [key: string]: string;
}

const INTEGRATIONS = [
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Accept UPI, cards, netbanking, and wallet payments. Used by 8M+ businesses in India.",
    logo: "💳",
    color: "border-blue-200 bg-blue-50/30",
    fields: [
      { key: "razorpay_key_id", label: "Key ID", placeholder: "rzp_live_xxxx", type: "text" },
      { key: "razorpay_key_secret", label: "Key Secret", placeholder: "Your Razorpay secret key", type: "password" },
      { key: "razorpay_webhook_secret", label: "Webhook Secret", placeholder: "For payment verification", type: "password" },
    ],
    docs: "https://razorpay.com/docs/api/",
    badge: "Payments",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "vmware",
    name: "VMware vCenter",
    description: "Provision and manage virtual machines. Automate VM creation, suspension, and termination for clients.",
    logo: "🖥️",
    color: "border-violet-200 bg-violet-50/30",
    fields: [
      { key: "vmware_host", label: "vCenter Host", placeholder: "https://vcenter.company.com", type: "url" },
      { key: "vmware_username", label: "Username", placeholder: "administrator@vsphere.local", type: "text" },
      { key: "vmware_password", label: "Password", placeholder: "vCenter password", type: "password" },
      { key: "vmware_datacenter", label: "Datacenter Name", placeholder: "DC01", type: "text" },
      { key: "vmware_cluster", label: "Cluster/Host", placeholder: "cluster01", type: "text" },
    ],
    docs: "https://developer.vmware.com/apis/vsphere-automation/",
    badge: "Infrastructure",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  {
    id: "tsplus",
    name: "TSplus",
    description: "Manage TSplus remote desktop and application delivery licenses. Provision user sessions for clients.",
    logo: "🔐",
    color: "border-emerald-200 bg-emerald-50/30",
    fields: [
      { key: "tsplus_server", label: "TSplus Server URL", placeholder: "https://rdp.company.com", type: "url" },
      { key: "tsplus_admin_user", label: "Admin Username", placeholder: "administrator", type: "text" },
      { key: "tsplus_admin_password", label: "Admin Password", placeholder: "TSplus admin password", type: "password" },
      { key: "tsplus_license_key", label: "License Key (optional)", placeholder: "For license management", type: "text" },
    ],
    docs: "https://docs.tsplus.net/",
    badge: "Remote Desktop",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "smtp",
    name: "Email (SMTP)",
    description: "Send branded transactional emails — invoices, renewals, welcome messages, and alerts.",
    logo: "📧",
    color: "border-orange-200 bg-orange-50/30",
    fields: [
      { key: "mail_host", label: "SMTP Host", placeholder: "smtp.gmail.com", type: "text" },
      { key: "mail_port", label: "Port", placeholder: "587", type: "number" },
      { key: "mail_username", label: "Username", placeholder: "you@gmail.com", type: "email" },
      { key: "mail_password", label: "Password / App Password", placeholder: "SMTP password", type: "password" },
      { key: "mail_from_address", label: "From Address", placeholder: "noreply@company.com", type: "email" },
      { key: "mail_from_name", label: "From Name", placeholder: "Your Company", type: "text" },
    ],
    docs: "https://nodemailer.com/",
    badge: "Notifications",
    badgeColor: "bg-orange-100 text-orange-700",
  },
  {
    id: "busy",
    name: "Busy Accounting Import",
    description: "Import existing clients, invoices, and billing history from Busy accounting software via CSV export.",
    logo: "📊",
    color: "border-yellow-200 bg-yellow-50/30",
    fields: [],
    docs: "https://www.busy.in/",
    badge: "Import",
    badgeColor: "bg-yellow-100 text-yellow-700",
    isImport: true,
  },
];

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<IntegrationConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mailEnabled, setMailEnabled] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: { key: string; value: string | null }[]) => {
        const map: IntegrationConfig = {};
        data.forEach((s) => { map[s.key] = s.value ?? ""; });
        setSettings(map);
        setMailEnabled(map.mail_enabled === "true");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (keys: string[]) => {
    setSaving(true);
    try {
      const subset = Object.fromEntries(keys.map((k) => [k, settings[k] ?? ""]));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: subset }),
      });
      if (!res.ok) throw new Error();
      toast.success("Integration saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!csvFile) { toast.error("Select a CSV file first"); return; }
    setImporting(true);
    const formData = new FormData();
    formData.append("file", csvFile);
    try {
      const res = await fetch("/api/admin/import/busy", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(`Imported ${data.clients ?? 0} clients, ${data.invoices ?? 0} invoices`);
      setCsvFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Connect your tools — payments, infrastructure, and accounting</p>
      </div>

      <div className="grid gap-6">
        {INTEGRATIONS.map((intg) => {
          const isConfigured = intg.fields.length > 0 &&
            intg.fields.some((f) => settings[f.key]);

          return (
            <Card key={intg.id} className={`border ${intg.color}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{intg.logo}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{intg.name}</CardTitle>
                        <Badge className={`text-[10px] h-4 px-1.5 border-0 ${intg.badgeColor}`}>
                          {intg.badge}
                        </Badge>
                        {isConfigured && (
                          <Badge className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700 border-0">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" />Configured
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-0.5">{intg.description}</CardDescription>
                    </div>
                  </div>
                  <a href={intg.docs} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    Docs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>

              {intg.fields.length > 0 && (
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {intg.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">{field.label}</Label>
                        <Input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={settings[field.key] ?? ""}
                          onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  {intg.id === "smtp" && (
                    <div className="flex items-center justify-between pt-1">
                      <Label className="text-sm font-medium text-gray-700">Enable email sending</Label>
                      <Switch
                        checked={mailEnabled}
                        onCheckedChange={(v) => {
                          setMailEnabled(v);
                          setSettings({ ...settings, mail_enabled: v ? "true" : "false" });
                        }}
                      />
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => save(intg.fields.map((f) => f.key).concat(intg.id === "smtp" ? ["mail_enabled"] : []))}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save {intg.name}
                  </Button>
                </CardContent>
              )}

              {intg.isImport && (
                <CardContent className="pt-0 space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-dashed border-gray-200 space-y-3">
                    <p className="text-sm font-medium text-gray-700">How to import from Busy:</p>
                    <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
                      <li>In Busy, go to Reports → Export Data → Clients/Parties</li>
                      <li>Export as CSV with columns: Name, Email, Phone, City, GST Number, Balance</li>
                      <li>Upload the CSV file below</li>
                    </ol>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                      />
                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={handleImport}
                        disabled={importing || !csvFile}
                      >
                        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Import
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

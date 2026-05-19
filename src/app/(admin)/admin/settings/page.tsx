"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Settings, Save, Loader2, Mail, CreditCard, Clock, FileText, Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const SETTING_GROUPS = {
  general: [
    { key: "app_name", label: "Application Name", type: "text", placeholder: "CloudCRM" },
    { key: "app_url", label: "Application URL", type: "url", placeholder: "https://yourdomain.com" },
    { key: "support_email", label: "Support Email", type: "email", placeholder: "support@yourdomain.com" },
    { key: "company_name", label: "Company Name", type: "text", placeholder: "Your Company Ltd" },
    { key: "billing_address", label: "Billing Address", type: "text", placeholder: "123 Main St, City, Country" },
    { key: "terms_url", label: "Terms of Service URL", type: "url", placeholder: "https://yourdomain.com/terms" },
    { key: "privacy_url", label: "Privacy Policy URL", type: "url", placeholder: "https://yourdomain.com/privacy" },
    { key: "default_currency", label: "Default Currency Code", type: "text", placeholder: "USD" },
    { key: "registration_enabled", label: "Allow New Registrations", type: "toggle" },
  ],
  billing: [
    { key: "invoice_prefix", label: "Invoice Number Prefix", type: "text", placeholder: "INV" },
    { key: "invoice_padding", label: "Invoice Number Padding (digits)", type: "number", placeholder: "4" },
    { key: "invoice_due_days", label: "Days Until Invoice Due", type: "number", placeholder: "7" },
    { key: "billing_renewal_days", label: "Days Before Expiry to Send Renewal Invoice", type: "number", placeholder: "7" },
    { key: "billing_suspend_days", label: "Days Overdue Before Suspension", type: "number", placeholder: "2" },
    { key: "billing_terminate_days", label: "Days Suspended Before Cancellation", type: "number", placeholder: "14" },
    { key: "tax_enabled", label: "Enable Tax", type: "toggle" },
    { key: "tax_type", label: "Tax Type (inclusive/exclusive)", type: "text", placeholder: "exclusive" },
    { key: "credits_enabled", label: "Enable Credits System", type: "toggle" },
    { key: "credits_auto_apply", label: "Auto-Apply Credits to Invoices", type: "toggle" },
  ],
  mail: [
    { key: "mail_enabled", label: "Enable Email Sending", type: "toggle" },
    { key: "mail_host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
    { key: "mail_port", label: "SMTP Port", type: "number", placeholder: "587" },
    { key: "mail_username", label: "SMTP Username", type: "text", placeholder: "user@gmail.com" },
    { key: "mail_password", label: "SMTP Password", type: "password", placeholder: "••••••••" },
    { key: "mail_from_address", label: "From Address", type: "email", placeholder: "noreply@yourdomain.com" },
    { key: "mail_from_name", label: "From Name", type: "text", placeholder: "CloudCRM" },
    { key: "mail_encryption", label: "Encryption (tls/ssl/none)", type: "text", placeholder: "tls" },
  ],
  cron: [
    { key: "cron_secret", label: "Cron Secret Key", type: "password", placeholder: "Secret for x-cron-secret header" },
    { key: "billing_renewal_days", label: "Renewal Reminder Days Before Expiry", type: "number", placeholder: "7" },
    { key: "billing_suspend_days", label: "Suspend After N Days Overdue", type: "number", placeholder: "2" },
    { key: "billing_terminate_days", label: "Terminate After N Days Suspended", type: "number", placeholder: "14" },
    { key: "ticket_auto_close_days", label: "Auto-Close Tickets After N Days Inactive", type: "number", placeholder: "7" },
  ],
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error();
      const data: { key: string; value: string | null }[] = await res.json();
      const map: Record<string, string> = {};
      data.forEach((s) => { map[s.key] = s.value ?? ""; });
      setSettings(map);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const setValue = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderField = (field: (typeof SETTING_GROUPS.general)[number]) => {
    if (field.type === "toggle") {
      return (
        <div key={field.key} className="flex items-center justify-between py-3">
          <Label htmlFor={field.key} className="text-sm font-medium cursor-pointer">
            {field.label}
          </Label>
          <Switch
            id={field.key}
            checked={settings[field.key] === "true"}
            onCheckedChange={(v) => setValue(field.key, v ? "true" : "false")}
          />
        </div>
      );
    }
    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Input
          id={field.key}
          type={field.type}
          value={settings[field.key] ?? ""}
          onChange={(e) => setValue(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your platform</p>
        </div>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Settings
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />General
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />Billing
          </TabsTrigger>
          <TabsTrigger value="mail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />Mail
          </TabsTrigger>
          <TabsTrigger value="cron" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />Cron
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />General Settings
              </CardTitle>
              <CardDescription>Company information and platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SETTING_GROUPS.general.map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />Billing Settings
              </CardTitle>
              <CardDescription>Invoice numbering, due dates, and service lifecycle timings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                Invoice Numbering
              </div>
              {SETTING_GROUPS.billing.slice(0, 2).map(renderField)}
              <p className="text-xs text-muted-foreground">
                Preview: {(settings.invoice_prefix ?? "INV")}-{String(1).padStart(parseInt(settings.invoice_padding ?? "4") || 4, "0")}
              </p>
              <Separator />
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                Billing Lifecycle
              </div>
              {SETTING_GROUPS.billing.slice(2, 6).map(renderField)}
              <Separator />
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                Tax & Credits
              </div>
              {SETTING_GROUPS.billing.slice(6).map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mail" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />Mail Settings
              </CardTitle>
              <CardDescription>SMTP configuration for sending emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SETTING_GROUPS.mail.map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cron" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />Cron Job Settings
              </CardTitle>
              <CardDescription>
                Configure automated billing tasks. Hit{" "}
                <code className="bg-muted px-1 rounded text-xs">POST /api/cron/billing</code> with{" "}
                <code className="bg-muted px-1 rounded text-xs">x-cron-secret</code> header daily.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SETTING_GROUPS.cron.map(renderField)}
              <Separator />
              <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Cron URL
                </p>
                <code className="text-xs break-all">
                  {settings.app_url ?? "https://yourdomain.com"}/api/cron/billing
                </code>
                <p className="text-xs text-muted-foreground">
                  Schedule this to run daily via crontab, Render cron, or Vercel cron.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

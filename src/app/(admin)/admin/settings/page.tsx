"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Save, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Setting {
  id: string;
  key: string;
  value: string | null;
  type: string;
}

const DEFAULT_SETTINGS = [
  { key: "app_name", label: "Application Name", type: "text" },
  { key: "app_url", label: "Application URL", type: "text" },
  { key: "support_email", label: "Support Email", type: "email" },
  { key: "billing_company", label: "Company Name", type: "text" },
  { key: "billing_address", label: "Company Address", type: "text" },
  { key: "default_currency", label: "Default Currency", type: "text" },
  { key: "invoice_due_days", label: "Invoice Due Days", type: "number" },
  { key: "terms_url", label: "Terms of Service URL", type: "text" },
  { key: "privacy_url", label: "Privacy Policy URL", type: "text" },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error();
      const data: Setting[] = await res.json();
      const map: Record<string, string> = {};
      data.forEach((s) => {
        map[s.key] = s.value ?? "";
      });
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
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your platform settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {DEFAULT_SETTINGS.map((setting, i) => (
            <div key={setting.key}>
              <div className="space-y-2">
                <Label htmlFor={setting.key}>{setting.label}</Label>
                <Input
                  id={setting.key}
                  type={setting.type}
                  value={settings[setting.key] ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, [setting.key]: e.target.value })
                  }
                  placeholder={`Enter ${setting.label.toLowerCase()}`}
                />
              </div>
              {i < DEFAULT_SETTINGS.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}

          <div className="pt-4">
            <Button onClick={saveSettings} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

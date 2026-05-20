"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  User, Lock, Key, Shield, Bell, Monitor, Plus, Trash2,
  Copy, Eye, EyeOff, Loader2, CheckCircle, Clock, LogOut,
  Smartphone, AlertTriangle, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const profileSchema = z.object({ name: z.string().min(2), email: z.string().email() });
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const [user, setUser] = useState<{ name?: string; email?: string; id?: string } | null>(null);
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  // Load user from Supabase
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (u) setUser({ name: (u.user_metadata?.name as string) ?? u.email, email: u.email, id: u.app_metadata?.prisma_id as string ?? u.id });
      });
    });
  }, []);

  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<any[]>([]);
  const [twoFAData, setTwoFAData] = useState<{ secret?: string; qrCode?: string; enabled?: boolean } | null>(null);
  const [twoFAToken, setTwoFAToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (user?.name) profileForm.reset({ name: user.name, email: user.email ?? "" });
  }, [user?.name]);

  useEffect(() => {
    Promise.all([
      fetch("/api/account/sessions").then(r => r.json()).then(setSessions).catch(() => {}),
      fetch("/api/account/api-keys").then(r => r.json()).then(setApiKeys).catch(() => {}),
      fetch("/api/account/notification-preferences").then(r => r.json()).then(setNotifPrefs).catch(() => {}),
      fetch("/api/account/2fa").then(r => r.json()).then(setTwoFAData).catch(() => {}),
    ]);
  }, []);

  const saveProfile = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      setUser((u) => u ? { ...u, name: data.name } : u);
      toast.success("Profile updated");
    } catch { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const changePassword = async (data: PasswordForm) => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      toast.success("Password changed");
      passwordForm.reset();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const revokeSession = async (id: string | "all") => {
    await fetch("/api/account/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    if (id === "all") setSessions([]);
    else setSessions(sessions.filter((s) => s.id !== id));
    toast.success("Session revoked");
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    const res = await fetch("/api/account/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName }),
    });
    const key = await res.json();
    if (!res.ok) { toast.error(key.error); return; }
    setApiKeys([key, ...apiKeys]);
    setNewKeyValue(key.key);
    setNewKeyName("");
    toast.success("API key created — copy it now, it won't be shown again");
  };

  const deleteApiKey = async (id: string) => {
    await fetch("/api/account/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast.success("API key deleted");
  };

  const enable2FA = async () => {
    if (!twoFAToken || !twoFAData?.secret) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: twoFAData.secret, token: twoFAToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecoveryCodes(data.recoveryCodes);
      setShowCodes(true);
      setTwoFAData({ enabled: true });
      toast.success("2FA enabled!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const disable2FA = async () => {
    if (!confirm("Disable two-factor authentication?")) return;
    await fetch("/api/account/2fa", { method: "DELETE" });
    setTwoFAData({ enabled: false });
    toast.success("2FA disabled");
  };

  const setup2FA = async () => {
    const res = await fetch("/api/account/2fa");
    const data = await res.json();
    setTwoFAData(data);
  };

  const saveNotifPrefs = async () => {
    setSavingPrefs(true);
    try {
      await fetch("/api/account/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifPrefs),
      });
      toast.success("Preferences saved");
    } catch { toast.error("Failed"); }
    finally { setSavingPrefs(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg font-bold bg-indigo-100 text-indigo-700">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5"><Monitor className="h-3.5 w-3.5" />Sessions</TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5"><Key className="h-3.5 w-3.5" />API Keys</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Alerts</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="border-gray-100">
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Personal Information</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Full Name</Label>
                    <Input {...profileForm.register("name")} className="h-9 text-sm" />
                    {profileForm.formState.errors.name && <p className="text-xs text-red-500">{profileForm.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" {...profileForm.register("email")} className="h-9 text-sm" />
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-gray-100">
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Change Password</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
                {[
                  { label: "Current Password", field: "currentPassword" as const },
                  { label: "New Password", field: "newPassword" as const },
                  { label: "Confirm New Password", field: "confirmPassword" as const },
                ].map(({ label, field }) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input type="password" {...passwordForm.register(field)} className="h-9 text-sm" />
                    {passwordForm.formState.errors[field] && <p className="text-xs text-red-500">{passwordForm.formState.errors[field]?.message}</p>}
                  </div>
                ))}
                <Button type="submit" size="sm" variant="outline" disabled={saving}>
                  {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab — 2FA */}
        <TabsContent value="security" className="mt-4">
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-gray-400" />Two-Factor Authentication
              </CardTitle>
              <CardDescription>Add an extra layer of security to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {twoFAData?.enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">2FA is enabled</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Your account is protected with TOTP authentication</p>
                    </div>
                  </div>

                  {showCodes && recoveryCodes.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />Save your recovery codes
                      </p>
                      <p className="text-xs text-amber-700 mb-3">Store these somewhere safe. Each can only be used once.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {recoveryCodes.map((code, i) => (
                          <code key={i} className="text-sm font-mono bg-white border border-amber-200 rounded px-3 py-1.5 text-center">{code}</code>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" onClick={disable2FA} className="text-red-600 hover:text-red-700 hover:border-red-300">
                    Disable 2FA
                  </Button>
                </div>
              ) : twoFAData?.qrCode ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                  <img src={twoFAData.qrCode} alt="QR Code" className="w-40 h-40 border rounded-lg" />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Enter the 6-digit code from your app</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="000000"
                        value={twoFAToken}
                        onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-9 text-sm w-32 text-center font-mono tracking-widest"
                        maxLength={6}
                      />
                      <Button size="sm" onClick={enable2FA} disabled={twoFAToken.length !== 6 || saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enable 2FA"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <Shield className="h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">2FA is not enabled</p>
                      <p className="text-xs text-gray-500 mt-0.5">Enable to protect your account with a second factor</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={setup2FA}>Set up 2FA</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4">
          <Card className="border-gray-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Login History</CardTitle>
                {sessions.length > 1 && (
                  <Button variant="outline" size="sm" className="text-red-600 h-7 text-xs" onClick={() => revokeSession("all")}>
                    <LogOut className="mr-1.5 h-3 w-3" />Revoke All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No login history</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sessions.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 shrink-0">
                        <Monitor className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{s.ipAddress ?? "Unknown device"}</p>
                        <p className="text-xs text-gray-400">
                          {s.userAgent ? s.userAgent.slice(0, 50) : "Browser"} ·{" "}
                          {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {i === 0 && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">Current</Badge>}
                      {i > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => revokeSession(s.id)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="mt-4 space-y-4">
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">API Keys</CardTitle>
              <CardDescription>Use API keys to access CloudCRM programmatically. Max 5 keys.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Key name (e.g. My Integration)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="h-9 text-sm"
                  maxLength={50}
                />
                <Button size="sm" onClick={createApiKey} disabled={!newKeyName.trim() || apiKeys.length >= 5} className="shrink-0 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />Create
                </Button>
              </div>

              {newKeyValue && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />Copy this key now — it won't be shown again
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-emerald-900 bg-white border border-emerald-200 px-3 py-1.5 rounded flex-1 truncate">{newKeyValue}</code>
                    <Button size="sm" variant="outline" className="shrink-0 h-7" onClick={() => { navigator.clipboard.writeText(newKeyValue); toast.success("Copied!"); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {apiKeys.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No API keys yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center gap-3 py-3">
                      <Key className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{k.name}</p>
                        <p className="text-xs text-gray-400">
                          Created {format(new Date(k.createdAt), "dd MMM yyyy")}
                          {k.lastUsedAt && <> · Last used {formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}</>}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600" onClick={() => deleteApiKey(k.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">Notification Preferences</CardTitle>
              <CardDescription>Choose which notifications you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifPrefs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Loading preferences...</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-gray-400 pb-2 border-b">
                    <span>Notification</span>
                    <span className="text-center">Email</span>
                    <span className="text-center">In-App</span>
                  </div>
                  <div className="space-y-3">
                    {notifPrefs.map((pref, i) => (
                      <div key={pref.key} className="grid grid-cols-3 gap-3 items-center">
                        <p className="text-sm text-gray-700">{pref.name}</p>
                        <div className="flex justify-center">
                          <Switch
                            checked={pref.emailEnabled}
                            onCheckedChange={(v) => {
                              const updated = [...notifPrefs];
                              updated[i] = { ...pref, emailEnabled: v };
                              setNotifPrefs(updated);
                            }}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={pref.inAppEnabled}
                            onCheckedChange={(v) => {
                              const updated = [...notifPrefs];
                              updated[i] = { ...pref, inAppEnabled: v };
                              setNotifPrefs(updated);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" onClick={saveNotifPrefs} disabled={savingPrefs}>
                    {savingPrefs && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save Preferences
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* GDPR footer */}
      <div className="border-t border-gray-100 pt-6 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</a>
        </div>
        <a
          href="/api/account/export"
          download
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          <Download className="h-3.5 w-3.5" />Export My Data
        </a>
      </div>
    </div>
  );
}

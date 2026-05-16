"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NotificationTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  enabled: boolean;
  mailEnabled: boolean;
  inAppEnabled: boolean;
}

export default function AdminNotificationsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editTemplate, setEditTemplate] =
    useState<NotificationTemplate | null>(null);
  const [form, setForm] = useState({
    subject: "",
    body: "",
    enabled: true,
    mailEnabled: true,
    inAppEnabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) throw new Error();
      setTemplates(await res.json());
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (tmpl: NotificationTemplate) => {
    setEditTemplate(tmpl);
    setForm({
      subject: tmpl.subject,
      body: "",
      enabled: tmpl.enabled,
      mailEnabled: tmpl.mailEnabled,
      inAppEnabled: tmpl.inAppEnabled,
    });
    setShowDialog(true);
  };

  const save = async () => {
    if (!editTemplate) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/admin/notifications/${editTemplate.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Template updated!");
      setShowDialog(false);
      fetchTemplates();
    } catch {
      toast.error("Failed to save template");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Templates</h1>
        <p className="text-muted-foreground mt-1">
          Customize email and in-app notification messages
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>In-App</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tmpl) => (
                  <TableRow key={tmpl.id}>
                    <TableCell className="font-medium">{tmpl.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {tmpl.key}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tmpl.mailEnabled ? "success" : "secondary"}
                      >
                        {tmpl.mailEnabled ? "On" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tmpl.inAppEnabled ? "success" : "secondary"}
                      >
                        {tmpl.inAppEnabled ? "On" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tmpl.enabled ? "success" : "secondary"}>
                        {tmpl.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(tmpl)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notification templates configured</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Template: {editTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Body (HTML supported, use {"{{variable}}"} for variables)</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Template body..."
                rows={6}
              />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm({ ...form, enabled: e.target.checked })
                  }
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mailEnabled"
                  checked={form.mailEnabled}
                  onChange={(e) =>
                    setForm({ ...form, mailEnabled: e.target.checked })
                  }
                />
                <Label htmlFor="mailEnabled">Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inAppEnabled"
                  checked={form.inAppEnabled}
                  onChange={(e) =>
                    setForm({ ...form, inAppEnabled: e.target.checked })
                  }
                />
                <Label htmlFor="inAppEnabled">In-App</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

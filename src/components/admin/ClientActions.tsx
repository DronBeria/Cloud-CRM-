"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Edit, Trash2, Mail, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  clientId: string;
  clientName: string;
  clientRole: string;
}

export function ClientActions({ clientId, clientName, clientRole }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(clientName);

  const handleDelete = async () => {
    if (!confirm(`Permanently delete ${clientName}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${clientId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Client deleted");
      router.push("/admin/clients");
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setLoading(false); }
  };

  const handleEdit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      toast.success("Client updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <MoreHorizontal className="h-4 w-4" />Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={async () => {
            const res = await fetch("/api/admin/impersonate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: clientId }),
            });
            if (res.ok) {
              window.open(`/dashboard?impersonating=${clientId}`, "_blank");
            }
          }}>
            <UserCheck className="mr-2 h-4 w-4 text-violet-500" />View as Client
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Mail className="mr-2 h-4 w-4" />Send Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />Delete Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

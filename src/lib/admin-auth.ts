import { createClient } from "@/lib/supabase/server";
import { canDo, type AdminOnlyPermission } from "@/lib/permissions";

export type StaffSession = {
  id: string;
  supabaseId: string;
  email: string;
  name: string;
  role: string;
  user: { id: string; role: string; name?: string; email?: string };
};

async function getSupabaseUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch { return null; }
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const user = await getSupabaseUser();
  if (!user) return null;
  const role = (user.app_metadata?.role as string) ?? "user";
  if (!["admin", "manager"].includes(role)) return null;
  const id = (user.app_metadata?.prisma_id as string) ?? user.id;
  const name = (user.user_metadata?.name as string) ?? user.email ?? "";
  return { id, supabaseId: user.id, email: user.email ?? "", name, role, user: { id, role, name, email: user.email } };
}

export async function getAdminSession(): Promise<StaffSession | null> {
  const session = await getStaffSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function checkPermission(permission: AdminOnlyPermission): Promise<boolean> {
  const session = await getStaffSession();
  if (!session) return false;
  return canDo(session.role, permission);
}

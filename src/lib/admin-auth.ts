import { auth } from "@/lib/auth";
import { isStaff, isAdmin, type AdminOnlyPermission, canDo } from "@/lib/permissions";

// Used in API routes — reads full session from JWT
export async function getStaffSession() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isStaff(role)) return null;
  return session as typeof session & { user: { id: string; role: string; name: string; email: string } };
}

export async function getAdminSession() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isAdmin(role)) return null;
  return session as typeof session & { user: { id: string; role: string } };
}

export async function requireStaff() {
  const session = await getStaffSession();
  if (!session) throw new Error("Forbidden");
  return session;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("Forbidden");
  return session;
}

export async function checkPermission(permission: AdminOnlyPermission): Promise<boolean> {
  const session = await getStaffSession();
  if (!session) return false;
  const role = (session.user as { role?: string }).role;
  return canDo(role, permission);
}

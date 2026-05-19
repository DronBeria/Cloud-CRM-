import { auth } from "@/lib/auth";
import { isStaff, isAdmin, type AdminOnlyPermission, canDo } from "@/lib/permissions";

// Returns session if user is staff (admin OR manager), else null
export async function getStaffSession() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isStaff(role)) return null;
  return session as typeof session & { user: { id: string; role: string; name: string; email: string } };
}

// Returns session if user is admin only, else null
export async function getAdminSession() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isAdmin(role)) return null;
  return session as typeof session & { user: { id: string; role: string } };
}

// Require staff — throws if not staff
export async function requireStaff() {
  const session = await getStaffSession();
  if (!session) throw new Error("Forbidden");
  return session;
}

// Require admin — throws if not admin
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("Forbidden");
  return session;
}

// Require specific admin-only permission
export async function requirePermission(permission: AdminOnlyPermission) {
  const session = await getStaffSession();
  if (!session) throw new Error("Forbidden");
  const role = (session.user as { role?: string }).role;
  if (!canDo(role, permission)) throw new Error("Forbidden");
  return session;
}

// Check permission without throwing — use in API routes
export async function checkPermission(permission: AdminOnlyPermission): Promise<boolean> {
  const session = await getStaffSession();
  if (!session) return false;
  const role = (session.user as { role?: string }).role;
  return canDo(role, permission);
}

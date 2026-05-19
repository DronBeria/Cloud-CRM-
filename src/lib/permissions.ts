// Role definitions
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
} as const;

export type StaffRole = "admin" | "manager";
export type UserRole = "admin" | "manager" | "user";

// Things ONLY admins can do (managers cannot)
const ADMIN_ONLY_PERMISSIONS = [
  "manage_staff",       // create/edit/delete manager accounts
  "manage_roles",       // change role permissions
  "manage_gateways",    // payment gateway config
  "manage_settings",    // billing/system settings
] as const;

export type AdminOnlyPermission = (typeof ADMIN_ONLY_PERMISSIONS)[number];

export function isStaff(role?: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function isAdmin(role?: string): boolean {
  return role === ROLES.ADMIN;
}

export function isManager(role?: string): boolean {
  return role === ROLES.MANAGER;
}

export function isClient(role?: string): boolean {
  return role === ROLES.USER;
}

// Check if a role can perform an admin-only action
export function canDo(role: string | undefined, permission: AdminOnlyPermission): boolean {
  return role === ROLES.ADMIN;
}

// Check if a role can access the admin panel at all
export function canAccessAdmin(role?: string): boolean {
  return isStaff(role);
}

// Staff session type guard
export function getSessionRole(session: { user?: { role?: string } } | null): string {
  return (session?.user as { role?: string } | undefined)?.role ?? "user";
}

// Returns 403 payload when permission denied
export function forbidden(message = "Forbidden") {
  return { error: message };
}

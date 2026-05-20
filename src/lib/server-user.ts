import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Fast session read for Server Components.
 * Reads user info from middleware-injected headers (no JWT decode needed).
 * Falls back to auth() if headers not present (e.g. API routes).
 */
export async function getServerUser() {
  const h = await headers();
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role");

  if (userId && role) {
    return { id: userId, role };
  }

  // Fallback for API routes / direct calls
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id ?? "",
    role: (session.user as { role?: string }).role ?? "user",
  };
}

export async function requireStaffUser() {
  const user = await getServerUser();
  if (!user || !["admin", "manager"].includes(user.role)) return null;
  return user;
}

/**
 * Auth is now handled by Supabase Auth (@supabase/ssr).
 * This file is kept for backwards compatibility during migration.
 * Use @/lib/supabase/auth for new code.
 */
export { getUser as getUser } from "@/lib/supabase/auth";

// Stub for any remaining imports
export const auth = async () => null;
export const signIn = async () => {};
export const signOut = async () => {};
export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
};

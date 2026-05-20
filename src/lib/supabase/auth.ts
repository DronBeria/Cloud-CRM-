import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppUser = {
  id: string;
  supabaseId: string;
  email: string;
  name: string;
  role: string;
};

/** Get current authenticated user. Returns null if not logged in. */
export async function getUser(): Promise<AppUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return {
      id: (user.app_metadata?.prisma_id as string) ?? user.id,
      supabaseId: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string) ?? user.email ?? "",
      role: (user.app_metadata?.role as string) ?? "user",
    };
  } catch { return null; }
}

/** Set role in Supabase app_metadata */
export async function setUserRole(supabaseId: string, role: string, prismaId?: string) {
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(supabaseId, {
    app_metadata: { role, ...(prismaId ? { prisma_id: prismaId } : {}) },
  });
}

/** Create Supabase auth user */
export async function createAuthUser(params: {
  email: string;
  password: string;
  name: string;
  role?: string;
  prismaId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { name: params.name },
    app_metadata: { role: params.role ?? "user", prisma_id: params.prismaId },
  });
  if (error) throw error;
  return data.user;
}

/** Get Supabase user by email */
export async function getAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email) ?? null;
}

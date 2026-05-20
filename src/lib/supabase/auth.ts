import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cache } from "react";

export type AppUser = {
  id: string;
  supabaseId: string;
  email: string;
  name: string;
  role: string;
};

/** Get current authenticated user. Auto-creates Prisma user on first login.
 *  Wrapped with React cache() — only one Supabase call per server render cycle. */
export const getUser = cache(async (): Promise<AppUser | null> => {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    let prismaId = user.app_metadata?.prisma_id as string | undefined;
    const role = (user.app_metadata?.role as string) ?? "user";
    const name = (user.user_metadata?.name as string) ?? user.email ?? "";

    // If no prisma_id, find or create the Prisma user and link it
    if (!prismaId) {
      const { db } = await import("@/lib/db");
      let prismaUser = await db.user.findUnique({
        where: { email: user.email! },
        select: { id: true },
      });

      if (!prismaUser) {
        // Auto-create Prisma user for Supabase-only accounts
        const userRole = await db.role.findFirst({ where: { name: "user" }, select: { id: true } });
        prismaUser = await db.user.create({
          data: {
            email: user.email!,
            name,
            password: "", // Supabase manages auth
            roleId: userRole?.id,
            emailVerifiedAt: new Date(),
          },
          select: { id: true },
        });
      }

      prismaId = prismaUser.id;

      // Link back to Supabase (fire-and-forget — don't block the response)
      const admin = createAdminClient();
      admin.auth.admin.updateUserById(user.id, {
        app_metadata: { prisma_id: prismaId, role },
      }).catch(() => {});
    }

    return { id: prismaId, supabaseId: user.id, email: user.email ?? "", name, role };
  } catch { return null; }
});

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

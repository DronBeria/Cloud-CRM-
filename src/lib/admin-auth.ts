import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export async function requireAdmin(): Promise<Session & { user: { id: string; role: string } }> {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;

  if (!session || !user || user.role !== "admin") {
    throw new Error("Forbidden");
  }

  return session as Session & { user: { id: string; role: string } };
}

export async function getAdminSession() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;
  if (!session || !user || user.role !== "admin") {
    return null;
  }
  return session;
}

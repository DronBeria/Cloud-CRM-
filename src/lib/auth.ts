/**
 * Full auth config with PrismaAdapter — used in API routes and Server Components.
 * NOT imported by middleware (would break Edge Runtime).
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    // Override Credentials with the real implementation (needs bcrypt + DB)
    ...authConfig.providers.filter((p) => p.id !== "credentials"),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
            select: { id: true, email: true, name: true, password: true, roleId: true, role: { select: { name: true } } },
          });

          if (!user?.password) {
            db.auditLog.create({ data: { action: "login_failed", entity: "auth", entityId: credentials.email as string } }).catch(() => {});
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          if (!isValid) {
            db.auditLog.create({ data: { userId: user.id, action: "login_failed", entity: "auth", entityId: user.id } }).catch(() => {});
            return null;
          }

          return { id: user.id, email: user.email, name: user.name, role: user.role?.name ?? "user", roleId: user.roleId ?? undefined };
        } catch { return null; }
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      try {
        const role = await db.role.findFirst({ where: { name: "user" }, select: { id: true } });
        if (role && user.id) await db.user.update({ where: { id: user.id }, data: { roleId: role.id }, select: { id: true } });
      } catch { /* non-fatal */ }
    },
    async signIn({ user }) {
      if (!user?.id) return;
      // Fire-and-forget — never blocks login
      db.userSession.create({ data: { userId: user.id, token: `s_${Date.now()}`, lastActiveAt: new Date() } }).catch(() => {});
    },
  },
});

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  roleId?: string;
};

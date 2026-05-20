import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID ?? "",
      clientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
    }),
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.roleId = (user as { roleId?: string }).roleId;
      }
      // No DB call on token refresh — role is persisted in JWT
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "user";
        (session.user as { roleId?: string }).roleId = token.roleId as string | undefined;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      try {
        const role = await db.role.findFirst({ where: { name: "user" }, select: { id: true } });
        if (role && user.id) await db.user.update({ where: { id: user.id }, data: { roleId: role.id }, select: { id: true } });
      } catch { /* non-fatal */ }
    },
    async signIn({ user }) {
      // Fire-and-forget — never blocks the login response
      if (!user?.id) return;
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

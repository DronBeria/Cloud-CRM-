/**
 * Edge-compatible auth config — NO Prisma, NO heavy imports.
 * Used by middleware (runs on Edge Runtime, no cold starts).
 * The full auth.ts adds PrismaAdapter on top of this for API routes.
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID ?? "",
      clientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
    }),
    // Credentials provider defined in full auth.ts (needs bcrypt — not edge-safe)
    Credentials({ credentials: {}, authorize: async () => null }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.roleId = (user as { roleId?: string }).roleId;
      }
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
    authorized({ auth }) {
      // Used by middleware — return true to allow, false to deny
      return !!auth;
    },
  },
};

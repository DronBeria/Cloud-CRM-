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
            include: { role: true },
          });

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role?.name ?? "user",
            roleId: user.roleId ?? undefined,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign in — attach role from user object
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
  },
  events: {
    async createUser({ user }) {
      try {
        let role = await db.role.findFirst({ where: { name: "user" } });
        if (!role) {
          role = await db.role.create({ data: { name: "user", permissions: [] } });
        }
        await db.user.update({
          where: { id: user.id },
          data: { roleId: role.id },
        });
      } catch {
        // Non-fatal
      }
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

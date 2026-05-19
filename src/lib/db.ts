import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// In production (Vercel serverless), each invocation gets its own module scope.
// We can't share across invocations, but we DO reuse within a warm invocation.
// In dev, we cache on globalThis to avoid exhausting connections on hot reload.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

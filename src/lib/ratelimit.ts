import { db } from "@/lib/db";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): Promise<{ success: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const existing = await db.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.resetAt < now) {
      // New window — reset counter
      await db.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { success: true, remaining: limit - 1, resetAt };
    }

    if (existing.count >= limit) {
      return { success: false, remaining: 0, resetAt: existing.resetAt };
    }

    await db.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return {
      success: true,
      remaining: limit - existing.count - 1,
      resetAt: existing.resetAt,
    };
  } catch {
    // On DB error, allow the request through
    return { success: true, remaining: limit, resetAt };
  }
}

export function getRateLimitKey(identifier: string, action: string): string {
  return `rl:${action}:${identifier}`;
}

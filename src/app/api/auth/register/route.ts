import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { rateLimit, getRateLimitKey } from "@/lib/ratelimit";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(getRateLimitKey(ip, "register"), { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    // Run existence check + role lookup in parallel
    const [existing, role] = await Promise.all([
      db.user.findUnique({ where: { email }, select: { id: true } }),
      db.role.findFirst({ where: { name: "user" }, select: { id: true } }),
    ]);

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // Hash + create user in parallel
    const [hashedPassword, roleId] = await Promise.all([
      bcrypt.hash(password, 10),
      role ? Promise.resolve(role.id) : db.role.create({ data: { name: "user", permissions: [] } }).then(r => r.id),
    ]);

    const user = await db.user.create({
      data: { name, email, password: hashedPassword, roleId, emailVerifiedAt: new Date() },
      select: { id: true, email: true, name: true },
    });

    // Create Supabase auth user — fire and forget (don't block response)
    // getUser() will auto-create the link on first login anyway
    import("@/lib/supabase/auth").then(({ createAuthUser }) =>
      createAuthUser({ email, password, name, role: "user", prismaId: user.id })
    ).catch(console.error);

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

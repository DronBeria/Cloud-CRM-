import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getRateLimitKey } from "@/lib/ratelimit";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = await rateLimit(getRateLimitKey(ip, "register"), { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure user role exists
    let role = await db.role.findFirst({ where: { name: "user" } });
    if (!role) {
      role = await db.role.create({ data: { name: "user", permissions: [] } });
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: role.id,
        emailVerifiedAt: new Date(),
      },
    });

    // Ensure USD currency exists
    await db.currency.upsert({
      where: { code: "USD" },
      create: {
        code: "USD",
        name: "US Dollar",
        prefix: "$",
        suffix: "",
        exchangeRate: 1,
        enabled: true,
      },
      update: {},
    });

    // Send welcome notification (fire and forget)
    sendNotification("client_created", user.id, { userName: name }).catch(console.error);

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

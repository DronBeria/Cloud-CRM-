import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { rateLimit, getRateLimitKey } from "@/lib/ratelimit";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  // Optional profile fields from step 2
  phone: z.string().optional(),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  // Optional plan from step 3
  selectedPlanId: z.string().optional(),
  claimTrial: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(getRateLimitKey(ip, "register"), { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, email, password, phone, companyName, gstin, city, state, country, selectedPlanId, claimTrial } = registerSchema.parse(body);

    const [existing, role] = await Promise.all([
      db.user.findUnique({ where: { email }, select: { id: true } }),
      db.role.findFirst({ where: { name: "user" }, select: { id: true } }),
    ]);

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const [hashedPassword, roleId] = await Promise.all([
      bcrypt.hash(password, 10),
      role ? Promise.resolve(role.id) : db.role.create({ data: { name: "user", permissions: [] } }).then((r) => r.id),
    ]);

    const user = await db.user.create({
      data: {
        name, email, password: hashedPassword, roleId,
        emailVerifiedAt: new Date(),
        phone: phone || undefined,
        companyName: companyName || undefined,
        gstin: gstin || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
      },
      select: { id: true, email: true, name: true },
    });

    // Add selected plan to cart (fire-and-forget)
    if (selectedPlanId) {
      const currency = await db.currency.findFirst({ where: { enabled: true }, select: { code: true } });
      if (currency) {
        db.cart.upsert({
          where: { userId: user.id },
          create: { userId: user.id, currencyCode: currency.code },
          update: {},
        }).then(async (cart) => {
          await db.cartItem.create({ data: { cartId: cart.id, planId: selectedPlanId } });
        }).catch(console.error);
      }
    }

    // Activate trial if requested (fire-and-forget — use the trial API logic)
    if (claimTrial) {
      import("@/lib/settings").then(async ({ getSetting }) => {
        const trialPlanId = await getSetting("trial_plan_id");
        if (!trialPlanId) return;
        const [plan, currency] = await Promise.all([
          db.plan.findUnique({ where: { id: trialPlanId }, include: { product: true } }),
          db.currency.findFirst({ where: { enabled: true } }),
        ]);
        if (!plan || !currency) return;
        const days = parseInt(await getSetting("trial_duration_days") ?? "7");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        await db.$transaction([
          db.service.create({
            data: {
              userId: user.id, productId: plan.productId, planId: plan.id,
              currencyCode: currency.code, status: "active", price: 0,
              isTrial: true, expiresAt, label: `${plan.product.name} — Free Trial`,
            },
          }),
          db.user.update({ where: { id: user.id }, data: { trialClaimedAt: new Date() } }),
        ]);
      }).catch(console.error);
    }

    // Create Supabase auth user — fire and forget
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

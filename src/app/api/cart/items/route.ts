import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  planId: z.string(),
  config: z.record(z.string()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { planId, config } = schema.parse(await req.json());

    const plan = await db.plan.findUnique({
      where: { id: planId },
      include: { prices: { include: { currency: true } } },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get or create cart
    let cart = await db.cart.findUnique({ where: { userId: session.user.id } });
    if (!cart) {
      await db.currency.upsert({
        where: { code: "USD" },
        create: { code: "USD", name: "US Dollar", prefix: "$", suffix: "", exchangeRate: 1, enabled: true },
        update: {},
      });
      cart = await db.cart.create({
        data: { userId: session.user.id, currencyCode: "USD" },
      });
    }

    const item = await db.cartItem.create({
      data: {
        cartId: cart.id,
        planId,
        config,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

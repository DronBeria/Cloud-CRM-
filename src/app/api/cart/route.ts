import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOrCreateCart(userId: string) {
  let cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          plan: {
            include: {
              product: true,
              prices: { include: { currency: true } },
            },
          },
        },
      },
      coupon: true,
      currency: true,
    },
  });

  if (!cart) {
    // Ensure USD currency
    await db.currency.upsert({
      where: { code: "USD" },
      create: { code: "USD", name: "US Dollar", prefix: "$", suffix: "", exchangeRate: 1, enabled: true },
      update: {},
    });

    cart = await db.cart.create({
      data: { userId, currencyCode: "USD" },
      include: {
        items: {
          include: {
            plan: {
              include: {
                product: true,
                prices: { include: { currency: true } },
              },
            },
          },
        },
        coupon: true,
        currency: true,
      },
    });
  }

  return cart;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cart = await getOrCreateCart(session.user.id);
  return NextResponse.json(cart);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.couponCode) {
    const coupon = await db.coupon.findUnique({
      where: { code: body.couponCode.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    if (coupon.maxUses && coupon.used >= coupon.maxUses) {
      return NextResponse.json({ error: "Coupon has reached its usage limit" }, { status: 400 });
    }

    await db.cart.update({
      where: { userId: session.user.id },
      data: { couponId: coupon.id },
    });
  }

  const cart = await getOrCreateCart(session.user.id);
  return NextResponse.json(cart);
}

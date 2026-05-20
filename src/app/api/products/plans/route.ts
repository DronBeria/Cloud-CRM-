import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public endpoint — returns all available plans for signup
export async function GET() {
  try {
    const plans = await db.plan.findMany({
      where: { isOneTime: false, product: { hidden: false } },
      include: {
        product: { select: { name: true, slug: true } },
        prices: {
          include: { currency: true },
          where: { currency: { enabled: true } },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      plans.map((p) => ({
        id: p.id,
        name: p.name,
        billingPeriod: p.billingPeriod,
        billingUnit: p.billingUnit,
        productName: p.product.name,
        productSlug: p.product.slug,
        price: p.prices[0] ? Number(p.prices[0].price) : undefined,
        prefix: p.prices[0]?.currency.prefix ?? "₹",
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

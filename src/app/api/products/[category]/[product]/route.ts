import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string; product: string }> }
) {
  const { category: categorySlug, product: productSlug } = await params;

  const product = await db.product.findFirst({
    where: {
      slug: productSlug,
      hidden: false,
      category: { slug: categorySlug },
    },
    include: {
      category: true,
      plans: {
        include: {
          prices: {
            include: { currency: true },
            where: { currency: { enabled: true } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      configOptions: {
        where: { hidden: false },
        orderBy: { sort: "asc" },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...product,
    plans: product.plans.map((plan) => ({
      ...plan,
      prices: plan.prices.map((p) => ({
        price: Number(p.price),
        setupFee: Number(p.setupFee),
        currency: {
          prefix: p.currency.prefix,
          suffix: p.currency.suffix,
          code: p.currency.code,
        },
      })),
    })),
  });
}

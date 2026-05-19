import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const products = await db.product.findMany({
    include: {
      category: true,
      _count: { select: { plans: true } },
    },
    orderBy: { sort: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, categoryId, hidden } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugify(name);

  const product = await db.product.create({
    data: {
      name,
      slug,
      description: description || null,
      categoryId: categoryId || null,
      hidden: hidden ?? false,
    },
  });

  return NextResponse.json(product, { status: 201 });
}

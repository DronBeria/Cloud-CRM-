import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const categories = await db.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sort: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, parentId } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = slugify(name);
  const category = await db.category.create({
    data: { name, slug, parentId: parentId || null },
  });

  return NextResponse.json(category, { status: 201 });
}

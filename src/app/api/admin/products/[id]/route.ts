import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, categoryId, hidden } = await req.json();

  const product = await db.product.update({
    where: { id },
    data: {
      name: name ?? undefined,
      slug: name ? slugify(name) : undefined,
      description: description ?? undefined,
      categoryId: categoryId || null,
      hidden: hidden ?? undefined,
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.product.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

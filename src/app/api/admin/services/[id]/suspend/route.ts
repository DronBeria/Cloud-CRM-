import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { suspendService, isTsplusProduct, isConfigured } from "@/lib/tsplus";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = await db.service.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.service.update({ where: { id }, data: { status: "suspended", suspendedAt: new Date() } });

  if (isConfigured() && isTsplusProduct(service.product.slug)) {
    try { await suspendService(id); } catch (e) { console.error("[TSplus suspend]", e); }
  }

  return NextResponse.json({ success: true });
}

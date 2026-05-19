import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  const tickets = await db.ticket.findMany({
    where: status ? { status } : {},
    include: { user: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: pageSize,
  });

  return NextResponse.json({ tickets });
}

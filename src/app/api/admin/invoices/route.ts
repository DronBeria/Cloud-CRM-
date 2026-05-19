import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  const where = status ? { status } : {};

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        currency: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total, pages: Math.ceil(total / pageSize) });
}

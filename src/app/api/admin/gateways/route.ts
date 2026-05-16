import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gateways = await db.gateway.findMany({
    include: { extension: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(gateways);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, enabled } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const gateway = await db.gateway.create({
    data: { name, enabled: enabled ?? false },
  });

  return NextResponse.json(gateway, { status: 201 });
}

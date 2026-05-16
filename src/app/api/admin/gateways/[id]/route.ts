import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, enabled, settings } = await req.json();

  const gateway = await db.gateway.update({
    where: { id },
    data: {
      name: name ?? undefined,
      enabled: enabled ?? undefined,
      settings: settings ?? undefined,
    },
  });

  return NextResponse.json(gateway);
}

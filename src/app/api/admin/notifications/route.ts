import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = await db.notificationTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await db.setting.findMany({
    where: { settingableType: null },
    orderBy: { key: "asc" },
  });

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { settings } = (await req.json()) as { settings: Record<string, string> };

  for (const [key, value] of Object.entries(settings)) {
    const existing = await db.setting.findFirst({
      where: { key, settingableType: null, settingableId: null },
    });

    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { value: value ?? "" },
      });
    } else {
      await db.setting.create({
        data: { key, value: value ?? "" },
      });
    }
  }

  return NextResponse.json({ success: true });
}

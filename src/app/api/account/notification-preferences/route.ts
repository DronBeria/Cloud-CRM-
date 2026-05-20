import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";

export async function GET() {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [templates, prefs] = await Promise.all([
    db.notificationTemplate.findMany({ where: { enabled: true }, select: { key: true, name: true } }),
    db.notificationPreference.findMany({ where: { userId: currentUser!.id } }),
  ]);

  const prefsMap = Object.fromEntries(prefs.map((p) => [p.templateKey, p]));

  return NextResponse.json(
    templates.map((t) => ({
      key: t.key,
      name: t.name,
      emailEnabled: prefsMap[t.key]?.emailEnabled ?? true,
      inAppEnabled: prefsMap[t.key]?.inAppEnabled ?? true,
    }))
  );
}

export async function PUT(req: NextRequest) {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs: { key: string; emailEnabled: boolean; inAppEnabled: boolean }[] = await req.json();

  for (const pref of prefs) {
    await db.notificationPreference.upsert({
      where: { userId_templateKey: { userId: currentUser!.id, templateKey: pref.key } },
      create: { userId: currentUser!.id, templateKey: pref.key, emailEnabled: pref.emailEnabled, inAppEnabled: pref.inAppEnabled },
      update: { emailEnabled: pref.emailEnabled, inAppEnabled: pref.inAppEnabled },
    });
  }

  return NextResponse.json({ success: true });
}

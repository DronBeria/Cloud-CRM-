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

  const { subject, body, enabled, mailEnabled, inAppEnabled, inAppTitle, inAppBody } =
    await req.json();

  const template = await db.notificationTemplate.update({
    where: { id },
    data: {
      subject: subject ?? undefined,
      body: body ?? undefined,
      enabled: enabled ?? undefined,
      mailEnabled: mailEnabled ?? undefined,
      inAppEnabled: inAppEnabled ?? undefined,
      inAppTitle: inAppTitle ?? undefined,
      inAppBody: inAppBody ?? undefined,
    },
  });

  return NextResponse.json(template);
}

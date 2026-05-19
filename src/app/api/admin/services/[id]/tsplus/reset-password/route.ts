import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { resetPassword } from "@/lib/tsplus";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await resetPassword(id);

    // Update stored password in metadata
    const service = await db.service.findUnique({ where: { id } });
    if (service) {
      const meta = (service.metadata as Record<string, string> | null) ?? {};
      await db.service.update({
        where: { id },
        data: { metadata: { ...meta, tsplus_password: result.password } },
      });
    }

    return NextResponse.json({ success: true, password: result.password });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to reset password" },
      { status: 500 }
    );
  }
}

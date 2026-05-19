import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { audit, ACTIONS } from "@/lib/audit";

// Impersonation stores the original admin session in a cookie
// and creates a new session as the target user

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();

  const target = await db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const adminRole = (session.user as { role?: string }).role;
  if (adminRole === target.role?.name) {
    return NextResponse.json({ error: "Cannot impersonate another admin" }, { status: 400 });
  }

  await audit({
    userId: (session.user as { id: string }).id,
    action: "impersonate_start",
    entity: "user",
    entityId: userId,
  });

  // Return target user info — the client will update the session
  return NextResponse.json({
    success: true,
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role?.name ?? "user",
    },
  });
}

export async function DELETE() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await audit({
    userId: (session.user as { id: string }).id,
    action: "impersonate_end",
    entity: "user",
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";

export async function GET() {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await db.userSession.findMany({
    where: { userId: currentUser!.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(sessions);
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();

  if (sessionId === "all") {
    await db.userSession.deleteMany({ where: { userId: currentUser!.id } });
  } else {
    await db.userSession.deleteMany({
      where: { id: sessionId, userId: currentUser!.id },
    });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await db.userSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(sessions);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();

  if (sessionId === "all") {
    await db.userSession.deleteMany({ where: { userId: session.user.id } });
  } else {
    await db.userSession.deleteMany({
      where: { id: sessionId, userId: session.user.id },
    });
  }

  return NextResponse.json({ success: true });
}

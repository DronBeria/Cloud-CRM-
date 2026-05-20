import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const notes = await db.clientNote.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { note, staffId } = await req.json();
  if (!note?.trim()) return NextResponse.json({ error: "Note is required" }, { status: 400 });

  const created = await db.clientNote.create({
    data: { clientId: id, staffId: staffId ?? session.id, note },
  });
  return NextResponse.json(created, { status: 201 });
}

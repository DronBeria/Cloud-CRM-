import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      messages: {
        include: {
          user: {
            select: { id: true, name: true, role: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userRole = currentUser?.role ?? "user";
  if (ticket.userId !== currentUser!.id && userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userRole = currentUser?.role ?? "user";
  if (ticket.userId !== currentUser!.id && userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.ticket.update({
    where: { id },
    data: {
      status: body.status,
      priority: body.priority,
    },
  });

  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sanitize } from "@/lib/sanitize";

const schema = z.object({ message: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionUser = session.user as { role?: string };
  if (ticket.userId !== session.user.id && sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (ticket.status === "closed") {
    return NextResponse.json(
      { error: "Cannot reply to a closed ticket" },
      { status: 400 }
    );
  }

  try {
    const body = schema.parse(await req.json());
    const message = sanitize(body.message, 10000);
    if (!message) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

    const isAdmin = sessionUser.role === "admin";
    const newStatus = isAdmin ? "replied" : "open";

    const [ticketMessage] = await db.$transaction([
      db.ticketMessage.create({
        data: {
          ticketId: id,
          userId: session.user.id,
          message,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      db.ticket.update({
        where: { id },
        data: { status: newStatus, updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(ticketMessage, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sanitize, sanitizeShort } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as { role?: string };
  const where =
    sessionUser.role === "admin" ? {} : { userId: session.user.id };

  const tickets = await db.ticket.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(tickets);
}

const createSchema = z.object({
  subject: z.string().min(5),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  message: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await req.json());
    const subject = sanitizeShort(body.subject);
    const message = sanitize(body.message, 10000);
    const priority = body.priority;

    const ticket = await db.ticket.create({
      data: {
        userId: session.user.id,
        subject,
        priority,
        status: "open",
        messages: {
          create: {
            userId: session.user.id,
            message,
          },
        },
      },
      include: {
        messages: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

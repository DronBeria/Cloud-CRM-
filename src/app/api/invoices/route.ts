import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await db.invoice.findMany({
    where: { userId: session.user.id },
    include: {
      currency: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    invoices.map((inv) => ({
      ...inv,
      total: inv.items.reduce(
        (s, i) => s + Number(i.price) * i.quantity,
        0
      ),
    }))
  );
}

const createSchema = z.object({
  currencyCode: z.string().default("USD"),
  dueAt: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      price: z.number(),
      quantity: z.number().int().default(1),
    })
  ),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await req.json());

    const invoice = await db.invoice.create({
      data: {
        userId: session.user.id,
        currencyCode: body.currencyCode,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        status: "pending",
        items: {
          create: body.items.map((item) => ({
            description: item.description,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true, currency: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

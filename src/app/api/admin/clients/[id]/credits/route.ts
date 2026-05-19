import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive(),
  currencyCode: z.string().default("INR"),
  description: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = schema.parse(await req.json());

    const currency = await db.currency.findUnique({ where: { code: body.currencyCode } });
    if (!currency) return NextResponse.json({ error: "Currency not found" }, { status: 404 });

    const credit = await db.credit.create({
      data: {
        userId: id,
        amount: body.amount,
        currencyCode: body.currencyCode,
        description: body.description ?? "Manual credit by admin",
      },
    });

    return NextResponse.json(credit, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: "Failed to add credit" }, { status: 500 });
  }
}

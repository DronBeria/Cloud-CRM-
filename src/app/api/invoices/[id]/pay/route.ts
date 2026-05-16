import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { items: true, currency: true },
  });

  if (!invoice || invoice.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (invoice.status !== "pending") {
    return NextResponse.json(
      { error: "Invoice is not pending" },
      { status: 400 }
    );
  }

  const total = invoice.items.reduce(
    (s, i) => s + Number(i.price) * i.quantity,
    0
  );

  // Check user credits
  const credits = await db.credit.findMany({
    where: { userId: session.user.id, currencyCode: invoice.currencyCode },
  });

  const totalCredits = credits.reduce((s, c) => s + Number(c.amount), 0);

  if (totalCredits >= total) {
    // Pay with credits
    await db.$transaction([
      db.credit.deleteMany({
        where: { userId: session.user.id, currencyCode: invoice.currencyCode },
      }),
      db.invoiceTransaction.create({
        data: {
          invoiceId: id,
          userId: session.user.id,
          amount: total,
          status: "succeeded",
          isCreditTransaction: true,
        },
      }),
      db.invoice.update({
        where: { id },
        data: { status: "paid" },
      }),
    ]);

    // Add back excess credits
    if (totalCredits > total) {
      await db.credit.create({
        data: {
          userId: session.user.id,
          currencyCode: invoice.currencyCode,
          amount: totalCredits - total,
        },
      });
    }

    return NextResponse.json({ success: true, method: "credits" });
  }

  // For external payment, return payment gateway URL (simplified)
  return NextResponse.json({
    success: false,
    requiresPayment: true,
    amount: total,
    currency: invoice.currencyCode,
    message: "No payment gateway configured. Please contact support.",
  });
}

// GET for redirect to pay page
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.redirect(
    new URL(`/invoices/${(await params).id}`, req.url)
  );
}

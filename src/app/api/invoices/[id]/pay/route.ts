import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { processInvoicePaid, applyCredits } from "@/lib/billing";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { items: true, currency: true },
  });

  if (!invoice || invoice.userId !== currentUser!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (invoice.status !== "pending") {
    return NextResponse.json({ error: "Invoice is not pending" }, { status: 400 });
  }

  const total = invoice.items.reduce(
    (s, i) => s + Number(i.price) * i.quantity,
    0
  );

  // Apply credits in a transaction
  const remaining = await db.$transaction(async (tx) => {
    return applyCredits(
      tx,
      invoice.id,
      session.user?.id ?? "",
      invoice.currencyCode,
      total
    );
  });

  if (remaining <= 0) {
    // Fully paid with credits — mark invoice as paid
    await db.invoice.update({
      where: { id },
      data: { status: "paid" },
    });
    await processInvoicePaid(id);
    return NextResponse.json({ success: true, method: "credits" });
  }

  // Partial credit applied — check if any enabled gateway exists
  const gateway = await db.gateway.findFirst({ where: { enabled: true } });
  if (!gateway) {
    return NextResponse.json({
      success: false,
      requiresPayment: true,
      amount: remaining,
      currency: invoice.currencyCode,
      creditsApplied: total - remaining,
      message: "No payment gateway configured. Please contact support.",
    });
  }

  // Return redirect to payment
  return NextResponse.json({
    success: false,
    requiresPayment: true,
    amount: remaining,
    currency: invoice.currencyCode,
    creditsApplied: total - remaining,
    gatewayId: gateway.id,
    gatewayName: gateway.name,
    paymentUrl: `/invoices/${id}/payment`,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.redirect(
    new URL(`/invoices/${(await params).id}`, req.url)
  );
}

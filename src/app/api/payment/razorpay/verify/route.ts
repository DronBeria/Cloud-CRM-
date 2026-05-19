import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { processInvoicePaid } from "@/lib/billing";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } =
    await req.json();

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });

  if (!invoice || invoice.userId !== session.user.id) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ success: true, message: "Already paid" });
  }

  const total = invoice.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  // Record transaction and mark paid
  await db.$transaction([
    db.invoiceTransaction.create({
      data: {
        invoiceId: invoice.id,
        userId: session.user.id,
        amount: total,
        status: "succeeded",
        transactionId: razorpay_payment_id,
      },
    }),
    db.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid" },
    }),
  ]);

  await processInvoicePaid(invoice.id);

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId } = await req.json();

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, currency: true },
  });

  if (!invoice || invoice.userId !== currentUser!.id) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status !== "pending") {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  const total = invoice.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  // Convert to INR paise (Razorpay uses smallest currency unit)
  let amountInPaise: number;
  if (invoice.currency.code === "INR") {
    amountInPaise = Math.round(total * 100);
  } else {
    const inrRate = parseFloat(process.env.INR_RATE ?? "83.5");
    amountInPaise = Math.round((total / Number(invoice.currency.exchangeRate)) * inrRate * 100);
  }

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: invoice.invoiceNumber ?? `INV-${invoice.number}`,
        notes: {
          invoiceId: invoice.id,
          clientId: invoice.userId,
        },
      }),
    });

    const order = await response.json();

    if (!response.ok) {
      console.error("[Razorpay] Order creation failed:", order);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      keyId,
      invoiceNumber: invoice.invoiceNumber ?? `#${invoice.number}`,
    });
  } catch (err) {
    console.error("[Razorpay] Error:", err);
    return NextResponse.json({ error: "Payment gateway unavailable" }, { status: 502 });
  }
}

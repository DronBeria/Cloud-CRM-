import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processInvoicePaid } from "@/lib/billing";
import { sendNotification } from "@/lib/notifications";

// Generic payment webhook — gateways POST here with transaction result
// Expected body: { invoiceId, gatewayId, transactionId, amount, status, signature? }
export async function POST(req: NextRequest) {
  let body: {
    invoiceId?: string;
    gatewayId?: string;
    transactionId?: string;
    amount?: number;
    status?: string;
    fee?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.invoiceId || !body.status) {
    return NextResponse.json(
      { error: "invoiceId and status are required" },
      { status: 400 }
    );
  }

  const invoice = await db.invoice.findUnique({
    where: { id: body.invoiceId },
    include: { items: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ ok: true, message: "Already paid" });
  }

  const total = invoice.items.reduce(
    (s, i) => s + Number(i.price) * i.quantity,
    0
  );
  const amount = body.amount ?? total;

  if (body.status === "succeeded" || body.status === "paid") {
    // Record transaction
    await db.invoiceTransaction.create({
      data: {
        invoiceId: invoice.id,
        gatewayId: body.gatewayId ?? null,
        userId: invoice.userId,
        amount,
        fee: body.fee ?? 0,
        status: "succeeded",
        transactionId: body.transactionId ?? null,
      },
    });

    // Mark invoice paid
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid" },
    });

    await processInvoicePaid(invoice.id);
  } else if (body.status === "failed") {
    await db.invoiceTransaction.create({
      data: {
        invoiceId: invoice.id,
        gatewayId: body.gatewayId ?? null,
        userId: invoice.userId,
        amount,
        status: "failed",
        transactionId: body.transactionId ?? null,
      },
    });

    sendNotification("invoice_payment_failed", invoice.userId, {
      invoiceNumber:
        invoice.invoiceNumber ?? `#${invoice.number}`,
      invoiceUrl: `/invoices/${invoice.id}`,
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { processInvoicePaid } from "@/lib/billing";

export async function GET(
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
    include: {
      currency: true,
      items: true,
      transactions: { include: { gateway: true } },
      user: { select: { name: true, email: true } },
      snapshot: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionUser = session.user as { role?: string };
  if (invoice.userId !== session.user.id && sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const total = invoice.items.reduce(
    (s, i) => s + Number(i.price) * i.quantity,
    0
  );
  const paid = invoice.transactions
    .filter((t) => t.status === "succeeded")
    .reduce((s, t) => s + Number(t.amount), 0);

  return NextResponse.json({ ...invoice, total, paid, remaining: total - paid });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const sessionUser = session?.user as { role?: string; id?: string } | undefined;
  if (!session || sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const prevInvoice = await db.invoice.findUnique({ where: { id } });

  const invoice = await db.invoice.update({
    where: { id },
    data: {
      status: body.status,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      notes: body.notes ?? undefined,
    },
  });

  // If admin manually marks as paid, trigger full lifecycle
  if (body.status === "paid" && prevInvoice?.status !== "paid") {
    // Create a manual payment transaction if none exists
    const existingPaid = await db.invoiceTransaction.findFirst({
      where: { invoiceId: id, status: "succeeded" },
    });
    if (!existingPaid) {
      const total = await db.invoiceItem.aggregate({
        where: { invoiceId: id },
        _sum: { price: true },
      });
      await db.invoiceTransaction.create({
        data: {
          invoiceId: id,
          userId: invoice.userId,
          amount: total._sum.price ?? 0,
          status: "succeeded",
        },
      });
    }
    await processInvoicePaid(id);
  }

  return NextResponse.json(invoice);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const sessionUser = session?.user as { role?: string } | undefined;
  if (!session || sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.invoice.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

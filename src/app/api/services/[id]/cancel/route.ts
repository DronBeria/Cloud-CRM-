import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendNotification } from "@/lib/notifications";

const schema = z.object({
  reason: z.string().optional(),
  type: z.enum(["immediate", "scheduled"]).default("scheduled"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await db.service.findUnique({
    where: { id },
    include: { product: true, plan: true, cancellation: true },
  });

  if (!service || service.userId !== currentUser!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (service.status === "cancelled") {
    return NextResponse.json({ error: "Service is already cancelled" }, { status: 400 });
  }

  if (service.cancellation) {
    return NextResponse.json(
      { error: "A cancellation request already exists for this service" },
      { status: 400 }
    );
  }

  const body = schema.parse(await req.json());

  const cancellation = await db.serviceCancellation.create({
    data: {
      serviceId: id,
      reason: body.reason,
      type: body.type,
    },
  });

  // Immediate cancellation — cancel right away
  if (body.type === "immediate") {
    await db.service.update({
      where: { id },
      data: { status: "cancelled" },
    });

    // Cancel any pending invoices for this service
    const items = await db.invoiceItem.findMany({ where: { serviceId: id } });
    for (const item of items) {
      const invoice = await db.invoice.findUnique({ where: { id: item.invoiceId } });
      if (invoice?.status === "pending") {
        await db.invoice.update({
          where: { id: item.invoiceId },
          data: { status: "cancelled" },
        });
      }
    }
  }

  const serviceName =
    service.label ?? service.product.name;
  const typeLabel =
    body.type === "immediate" ? "immediately" : "at the end of the billing period";

  sendNotification("service_cancellation_received", currentUser!.id, {
    serviceName,
    cancellationType: typeLabel,
  }).catch(console.error);

  return NextResponse.json({ success: true, cancellation });
}

// Admin can delete a cancellation request
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.serviceCancellation.deleteMany({ where: { serviceId: id } });
  return NextResponse.json({ success: true });
}

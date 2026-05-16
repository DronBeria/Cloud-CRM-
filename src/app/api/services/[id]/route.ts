import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await db.service.findUnique({
    where: { id },
    include: {
      product: { include: { category: true } },
      plan: { include: { prices: { include: { currency: true } } } },
      order: { include: { invoice: true } },
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionUser = session.user as { role?: string };
  if (service.userId !== session.user.id && sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(service);
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
  const service = await db.service.update({
    where: { id },
    data: {
      status: body.status,
      label: body.label,
    },
  });

  return NextResponse.json(service);
}

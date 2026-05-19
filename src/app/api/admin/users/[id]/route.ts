import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { canDo } from "@/lib/permissions";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  companyName: z.string().optional(),
  roleId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id },
    include: {
      role: true,
      _count: { select: { services: true, invoices: true, tickets: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = updateSchema.parse(await req.json());
    const user = await db.user.update({ where: { id }, data: body });
    return NextResponse.json(user);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getStaffSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only admins can delete users
  if (!canDo(role, "manage_staff")) {
    // Actually allow managers to delete clients (not staff)
    const target = await db.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const targetRole = target.role?.name ?? "user";
    if (targetRole !== "user") {
      return NextResponse.json(
        { error: "Only admins can delete staff accounts" },
        { status: 403 }
      );
    }
  }

  await db.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

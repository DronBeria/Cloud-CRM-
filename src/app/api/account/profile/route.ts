import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postcode: z.string().optional(),
});

export async function GET() {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: currentUser!.id },
    select: { id: true, name: true, email: true, phone: true, companyName: true, gstin: true, address: true, city: true, state: true, country: true, postcode: true },
  });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = schema.parse(await req.json());

    const existing = await db.user.findFirst({
      where: { email: data.email, NOT: { id: currentUser!.id } },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const user = await db.user.update({
      where: { id: currentUser!.id },
      data,
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

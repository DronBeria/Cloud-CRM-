import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

export async function GET() {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await db.apiKey.findMany({
    where: { userId: currentUser!.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, createdAt: true },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = z.object({ name: z.string().min(1).max(50) }).parse(await req.json());

  const count = await db.apiKey.count({ where: { userId: currentUser!.id } });
  if (count >= 5) {
    return NextResponse.json({ error: "Maximum 5 API keys allowed" }, { status: 400 });
  }

  const key = `ccrm_${crypto.randomBytes(24).toString("hex")}`;

  const apiKey = await db.apiKey.create({
    data: { userId: currentUser!.id, name, key },
  });

  // Return full key only on creation — never shown again
  return NextResponse.json({ ...apiKey, key }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await db.apiKey.deleteMany({ where: { id, userId: currentUser!.id } });
  return NextResponse.json({ success: true });
}

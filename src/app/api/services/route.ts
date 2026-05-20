import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await db.service.findMany({
    where: { userId: currentUser!.id },
    include: {
      product: { include: { category: true } },
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(services);
}

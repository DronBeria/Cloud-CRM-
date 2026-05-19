import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      version: process.env.npm_package_version ?? "1.0.0",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "ok", latencyMs: dbLatency },
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: "error", error: String(err) },
        },
      },
      { status: 503 }
    );
  }
}

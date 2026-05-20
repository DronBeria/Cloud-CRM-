import { NextResponse } from "next/server";

// NextAuth removed — auth is now handled by Supabase Auth
// Supabase uses /auth/callback for OAuth redirects
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

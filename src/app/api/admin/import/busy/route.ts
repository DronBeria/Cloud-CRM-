import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: "File is empty" }, { status: 400 });

    // Parse CSV headers
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

    const clientRole = await db.role.findFirst({ where: { name: "user" } });
    let clients = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/['"]/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

      const name = row.name || row.party || row["party name"] || row["client name"] || "";
      const email = row.email || row["email id"] || row["email address"] || "";

      if (!name) continue;

      // Generate email if missing
      const clientEmail = email || `${name.toLowerCase().replace(/\s+/g, ".")}@imported.local`;

      const existing = await db.user.findUnique({ where: { email: clientEmail } });
      if (existing) continue;

      const tempPassword = await bcrypt.hash("ChangeMe@123", 10);

      await db.user.create({
        data: {
          name,
          email: clientEmail,
          password: tempPassword,
          phone: row.phone || row.mobile || row.contact || undefined,
          city: row.city || undefined,
          state: row.state || undefined,
          country: row.country || "India",
          companyName: row.company || row["company name"] || row.firm || undefined,
          roleId: clientRole?.id,
          emailVerifiedAt: new Date(),
        },
      });
      clients++;
    }

    return NextResponse.json({ success: true, clients, invoices: 0 });
  } catch (err) {
    console.error("[Busy Import]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

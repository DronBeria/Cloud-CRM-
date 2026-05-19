import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/mailer";
import { getSetting } from "@/lib/settings";

const schema = z.object({
  // "create" = admin creates account and sends invite
  // "invite" = system sends a unique signup link to the lead
  method: z.enum(["create", "invite"]),
  password: z.string().min(8).optional(), // only for method=create
  sendEmail: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lead.status === "converted") {
    return NextResponse.json({ error: "Lead already converted" }, { status: 400 });
  }

  const body = schema.parse(await req.json());
  const appUrl = (await getSetting("app_url")) ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const appName = (await getSetting("app_name")) ?? "CloudCRM";

  if (body.method === "create") {
    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email: lead.email } });
    if (existing) {
      // Just mark the lead as converted and link it
      await db.lead.update({
        where: { id },
        data: { status: "converted", convertedAt: new Date(), clientId: existing.id },
      });
      return NextResponse.json({ success: true, userId: existing.id, existing: true });
    }

    const userRole = await db.role.findFirst({ where: { name: "user" } });
    const tempPassword = body.password ?? generatePassword();
    const hashed = await bcrypt.hash(tempPassword, 10);

    const user = await db.user.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        password: hashed,
        roleId: userRole?.id,
        emailVerifiedAt: new Date(),
      },
    });

    // Mark lead as converted
    await db.lead.update({
      where: { id },
      data: { status: "converted", convertedAt: new Date(), clientId: user.id },
    });

    // Send welcome email with credentials
    if (body.sendEmail) {
      await sendMail({
        to: lead.email,
        subject: `Welcome to ${appName} — Your Account is Ready`,
        html: `
          <p>Hi ${lead.name},</p>
          <p>Your account has been created. Here are your login details:</p>
          <p><strong>Email:</strong> ${lead.email}<br>
          <strong>Password:</strong> ${tempPassword}</p>
          <p>Please <a href="${appUrl}/login">sign in here</a> and change your password.</p>
          <p>Welcome aboard!</p>
        `,
      });
    }

    return NextResponse.json({ success: true, userId: user.id });
  }

  if (body.method === "invite") {
    // Generate a unique invite token
    const token = crypto.randomUUID();

    // Store it as a verification token (reusing existing table)
    await db.verificationToken.create({
      data: {
        identifier: lead.email,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const inviteUrl = `${appUrl}/register?invite=${token}&email=${encodeURIComponent(lead.email)}&name=${encodeURIComponent(lead.name)}`;

    if (body.sendEmail) {
      await sendMail({
        to: lead.email,
        subject: `You're invited to ${appName}`,
        html: `
          <p>Hi ${lead.name},</p>
          <p>You've been invited to create an account on <strong>${appName}</strong>.</p>
          <p><a href="${inviteUrl}">Click here to create your account</a></p>
          <p>This link expires in 7 days.</p>
        `,
      });
    }

    // Mark lead status as contacted/qualified pending their signup
    await db.lead.update({
      where: { id },
      data: { status: "qualified" },
    });

    return NextResponse.json({ success: true, inviteUrl });
  }

  return NextResponse.json({ error: "Invalid method" }, { status: 400 });
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

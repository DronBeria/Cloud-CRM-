import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { z } from "zod";
import crypto from "crypto";
import { rateLimit, getRateLimitKey } from "@/lib/ratelimit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(getRateLimitKey(ip, "forgot-password"), { limit: 3, windowMs: 300_000 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Try again in 5 minutes." }, { status: 429 });
  }

  try {
    const { email } = schema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await db.verificationToken.deleteMany({ where: { identifier: email } });
      await db.verificationToken.create({
        data: { identifier: email, token, expires },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM";
      const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

      await sendMail({
        to: email,
        subject: `Reset your ${appName} password`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Reset your password</h2>
            <p>Hi ${user.name},</p>
            <p>Click the button below to reset your password. This link expires in 1 hour.</p>
            <p><a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Reset Password</a></p>
            <p style="color:#6b7280;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}

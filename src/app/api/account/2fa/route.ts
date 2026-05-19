import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Generate 2FA secret + QR code
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { TOTP } = await import("otpauth");
    const QRCode = await import("qrcode");

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, twoFactorSecret: true },
    });

    if (user?.twoFactorSecret) {
      return NextResponse.json({ enabled: true });
    }

    const totp = new TOTP({
      issuer: process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM",
      label: user?.email ?? session.user.id,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const uri = totp.toString();
    const qrCode = await QRCode.default.toDataURL(uri);

    return NextResponse.json({ secret, qrCode, enabled: false });
  } catch (e) {
    return NextResponse.json({ error: "Failed to generate 2FA" }, { status: 500 });
  }
}

// Enable 2FA — verify token and save secret
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { secret, token } = await req.json();

  try {
    const { TOTP } = await import("otpauth");

    const totp = new TOTP({ secret, algorithm: "SHA1", digits: 6, period: 30 });
    const delta = totp.validate({ token, window: 1 });

    if (delta === null) {
      return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
    }

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 8).toUpperCase()
    );

    await db.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorRecoveryCodes: JSON.stringify(recoveryCodes),
      },
    });

    return NextResponse.json({ success: true, recoveryCodes });
  } catch {
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 });
  }
}

// Disable 2FA
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: null, twoFactorRecoveryCodes: null },
  });

  return NextResponse.json({ success: true });
}

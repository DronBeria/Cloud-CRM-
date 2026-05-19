import nodemailer from "nodemailer";
import { getMailSettings } from "@/lib/settings";

export async function getTransporter() {
  const mail = await getMailSettings();
  if (!mail.enabled || !mail.host) return null;

  return nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.encryption === "ssl",
    auth: mail.username
      ? { user: mail.username, pass: mail.password }
      : undefined,
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  userId?: string;
  templateKey?: string;
}) {
  try {
    const transporter = await getTransporter();
    if (!transporter) return;

    const mail = await getMailSettings();
    await transporter.sendMail({
      from: `"${mail.fromName}" <${mail.fromAddress}>`,
      to: opts.to,
      cc: opts.cc?.join(","),
      bcc: opts.bcc?.join(","),
      subject: opts.subject,
      html: opts.html,
    });

    // Log successful send
    const { db } = await import("@/lib/db");
    await db.emailLog.create({
      data: { to: opts.to, subject: opts.subject, status: "sent", userId: opts.userId, templateKey: opts.templateKey },
    }).catch(() => {});
  } catch (err) {
    console.error("[Mailer] Failed to send email:", err);
    // Log failure
    try {
      const { db } = await import("@/lib/db");
      await db.emailLog.create({
        data: { to: opts.to, subject: opts.subject, status: "failed", error: String(err), userId: opts.userId, templateKey: opts.templateKey },
      });
    } catch { /* silent */ }
  }
}

// Renders a simple HTML template with variable substitution
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

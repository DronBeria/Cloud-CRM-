import nodemailer from "nodemailer";
import { db } from "@/lib/db";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "CloudCRM <noreply@cloudcrm.app>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      cc: options.cc?.join(", "),
      bcc: options.bcc?.join(", "),
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
  }
  return result;
}

export async function sendNotificationEmail(
  key: string,
  to: string,
  variables: Record<string, string>
): Promise<void> {
  const template = await db.notificationTemplate.findUnique({
    where: { key },
  });

  if (!template || !template.enabled || !template.mailEnabled) {
    return;
  }

  const subject = renderTemplate(template.subject, variables);
  const html = renderTemplate(template.body, variables);

  await sendEmail({
    to,
    subject,
    html,
    cc: Array.isArray(template.cc) ? (template.cc as string[]) : [],
    bcc: Array.isArray(template.bcc) ? (template.bcc as string[]) : [],
  });
}

export function emailTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #0f172a; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .body { padding: 32px; color: #1e293b; line-height: 1.6; }
    .footer { background: #f8fafc; padding: 16px 32px; text-align: center; color: #64748b; font-size: 12px; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .info-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const html = emailTemplate(
    `
    <h2>Reset Your Password</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <p><a href="${resetUrl}" class="btn">Reset Password</a></p>
    <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    `,
    "Reset Your Password"
  );

  await sendEmail({ to: email, subject: "Reset Your Password", html });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const html = emailTemplate(
    `
    <h2>Welcome to ${process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}!</h2>
    <p>Hi ${name},</p>
    <p>Your account has been created successfully. You can now log in and start using our services.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login" class="btn">Log In Now</a></p>
    <p>If you have any questions, please don't hesitate to open a support ticket.</p>
    `,
    "Welcome!"
  );

  await sendEmail({ to: email, subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM"}!`, html });
}

export async function sendInvoiceEmail(
  email: string,
  name: string,
  invoiceNumber: number,
  amount: string,
  dueDate: string,
  invoiceUrl: string
): Promise<void> {
  const html = emailTemplate(
    `
    <h2>Invoice #${invoiceNumber}</h2>
    <p>Hi ${name},</p>
    <p>Your invoice is ready. Please review and pay it before the due date.</p>
    <div class="info-box">
      <strong>Amount Due:</strong> ${amount}<br />
      <strong>Due Date:</strong> ${dueDate}
    </div>
    <p><a href="${invoiceUrl}" class="btn">View & Pay Invoice</a></p>
    `,
    `Invoice #${invoiceNumber}`
  );

  await sendEmail({
    to: email,
    subject: `Invoice #${invoiceNumber} - ${amount} Due`,
    html,
  });
}

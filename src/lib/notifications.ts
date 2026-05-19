import { db } from "@/lib/db";
import { sendMail, renderTemplate } from "@/lib/mailer";

type NotificationVars = Record<string, string>;

export async function sendNotification(
  key: string,
  userId: string,
  vars: NotificationVars = {}
) {
  try {
    const [template, user] = await Promise.all([
      db.notificationTemplate.findUnique({ where: { key, enabled: true } }),
      db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
    ]);

    if (!template || !user) return;

    const allVars: NotificationVars = { userName: user.name, ...vars };

    // Send email
    if (template.mailEnabled) {
      const subject = renderTemplate(template.subject, allVars);
      const html = renderTemplate(template.body, allVars);
      await sendMail({
        to: user.email,
        subject,
        html,
        cc: (template.cc as string[]) ?? [],
        bcc: (template.bcc as string[]) ?? [],
      });
    }

    // Create in-app notification
    if (template.inAppEnabled && template.inAppTitle) {
      const title = renderTemplate(template.inAppTitle, allVars);
      const body = template.inAppBody
        ? renderTemplate(template.inAppBody, allVars)
        : "";
      await db.notification.create({
        data: {
          userId,
          title,
          body,
          url: vars.invoiceUrl ?? vars.serviceUrl ?? null,
        },
      });
    }
  } catch (err) {
    console.error(`[Notifications] Failed to send "${key}":`, err);
  }
}

// Seed default notification templates if they don't exist
export async function seedNotificationTemplates() {
  const defaults = [
    {
      key: "invoice_created",
      name: "Invoice Created",
      subject: "Invoice {{invoiceNumber}} — {{amount}} {{currency}}",
      body: `<p>Hi {{userName}},</p><p>A new invoice <strong>{{invoiceNumber}}</strong> for <strong>{{amount}} {{currency}}</strong> has been created.</p><p><a href="{{invoiceUrl}}">View Invoice</a></p>`,
      inAppTitle: "Invoice {{invoiceNumber}} created",
      inAppBody: "Amount due: {{amount}} {{currency}}",
    },
    {
      key: "invoice_paid",
      name: "Invoice Paid",
      subject: "Payment Confirmed — Invoice {{invoiceNumber}}",
      body: `<p>Hi {{userName}},</p><p>Your payment of <strong>{{amount}} {{currency}}</strong> for invoice <strong>{{invoiceNumber}}</strong> has been confirmed. Thank you!</p><p><a href="{{invoiceUrl}}">View Invoice</a></p>`,
      inAppTitle: "Invoice {{invoiceNumber}} paid",
      inAppBody: "Payment of {{amount}} {{currency}} confirmed.",
    },
    {
      key: "invoice_payment_failed",
      name: "Payment Failed",
      subject: "Payment Failed — Invoice {{invoiceNumber}}",
      body: `<p>Hi {{userName}},</p><p>Your payment for invoice <strong>{{invoiceNumber}}</strong> has failed. Please update your payment method and try again.</p><p><a href="{{invoiceUrl}}">View Invoice</a></p>`,
      inAppTitle: "Payment failed for {{invoiceNumber}}",
      inAppBody: "Please retry payment.",
    },
    {
      key: "service_suspended",
      name: "Service Suspended",
      subject: "Service Suspended — Action Required",
      body: `<p>Hi {{userName}},</p><p>Your service <strong>{{serviceName}}</strong> has been suspended due to an overdue invoice. Please pay your outstanding balance to restore access.</p><p><a href="{{invoiceUrl}}">Pay Now</a></p>`,
      inAppTitle: "Service suspended",
      inAppBody: "{{serviceName}} suspended due to overdue invoice.",
    },
    {
      key: "service_cancellation_received",
      name: "Cancellation Request Received",
      subject: "Cancellation Request — {{serviceName}}",
      body: `<p>Hi {{userName}},</p><p>Your cancellation request for <strong>{{serviceName}}</strong> has been received and will be processed {{cancellationType}}.</p>`,
      inAppTitle: "Cancellation requested",
      inAppBody: "{{serviceName}} cancellation is being processed.",
    },
    {
      key: "ticket_reply",
      name: "Ticket Reply",
      subject: "New Reply — Ticket #{{ticketId}}",
      body: `<p>Hi {{userName}},</p><p>A new reply has been added to your support ticket: <strong>{{ticketSubject}}</strong>.</p><p><a href="{{ticketUrl}}">View Ticket</a></p>`,
      inAppTitle: "New reply on ticket #{{ticketId}}",
      inAppBody: "{{ticketSubject}}",
    },
    {
      key: "renewal_reminder",
      name: "Renewal Reminder",
      subject: "Your service renews in {{daysUntilRenewal}} days",
      body: `<p>Hi {{userName}},</p><p>Your service <strong>{{serviceName}}</strong> is set to renew in <strong>{{daysUntilRenewal}} days</strong> on {{renewalDate}}.</p><p><a href="{{invoiceUrl}}">View Invoice</a></p>`,
      inAppTitle: "Service renews in {{daysUntilRenewal}} days",
      inAppBody: "{{serviceName}} — renewal on {{renewalDate}}",
    },
  ];

  for (const tmpl of defaults) {
    await db.notificationTemplate.upsert({
      where: { key: tmpl.key },
      update: {},
      create: {
        ...tmpl,
        cc: [],
        bcc: [],
        mailEnabled: true,
        inAppEnabled: true,
      },
    });
  }
}

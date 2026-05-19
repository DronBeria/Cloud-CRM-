import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GDPR Article 20 — Right to data portability
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [user, invoices, services, tickets, credits, sessions, apiKeys] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, companyName: true, gstin: true, address: true, city: true, state: true, country: true, postcode: true, createdAt: true },
    }),
    db.invoice.findMany({
      where: { userId },
      include: { items: true, transactions: { select: { amount: true, status: true, createdAt: true } } },
    }),
    db.service.findMany({
      where: { userId },
      include: { product: { select: { name: true } }, plan: { select: { name: true } } },
    }),
    db.ticket.findMany({
      where: { userId },
      include: { messages: { select: { message: true, isStaff: true, createdAt: true } } },
    }),
    db.credit.findMany({ where: { userId } }),
    db.userSession.findMany({ where: { userId }, select: { ipAddress: true, userAgent: true, createdAt: true } }),
    db.apiKey.findMany({ where: { userId }, select: { name: true, createdAt: true, lastUsedAt: true } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportedBy: userId,
    dataSubjectRights: "This export fulfills your right to data portability under applicable data protection law.",
    profile: user,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber ?? `#${inv.number}`,
      status: inv.status,
      currencyCode: inv.currencyCode,
      createdAt: inv.createdAt,
      paidAt: inv.paidAt,
      items: inv.items.map((i) => ({ description: i.description, price: Number(i.price), quantity: i.quantity })),
      transactions: inv.transactions,
    })),
    services: services.map((s) => ({
      id: s.id,
      product: s.product.name,
      plan: s.plan?.name,
      status: s.status,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    supportTickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
      messages: t.messages,
    })),
    credits,
    loginHistory: sessions,
    apiKeys: apiKeys.map((k) => ({ name: k.name, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cloudcrm-data-export-${userId.slice(0, 8)}.json"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      currency: true,
      items: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userRole = currentUser?.role ?? "user";
  if (invoice.userId !== currentUser!.id && userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const companyName = process.env.NEXT_PUBLIC_APP_NAME ?? "CloudCRM";
    const companyEmail = process.env.SMTP_FROM ?? "noreply@cloudcrm.app";

    const pdfBuffer = await generateInvoicePdf({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      dueAt: invoice.dueAt,
      createdAt: invoice.createdAt,
      currencyPrefix: invoice.currency.prefix,
      currencySuffix: invoice.currency.suffix,
      user: invoice.user,
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      companyName,
      companyEmail,
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.number}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

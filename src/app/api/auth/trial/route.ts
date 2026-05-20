import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { sendNotification } from "@/lib/notifications";

export async function POST() {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check trial already claimed
  const user = await db.user.findUnique({
    where: { id: currentUser.id },
    select: { trialClaimedAt: true },
  });

  if (user?.trialClaimedAt) {
    return NextResponse.json({ error: "Free trial already claimed." }, { status: 400 });
  }

  // Get trial plan from settings
  const trialPlanId = await getSetting("trial_plan_id");
  if (!trialPlanId) {
    return NextResponse.json({ error: "Free trial is not configured yet. Contact support." }, { status: 404 });
  }

  const plan = await db.plan.findUnique({
    where: { id: trialPlanId },
    include: { product: true, prices: { take: 1, include: { currency: true } } },
  });

  if (!plan) {
    return NextResponse.json({ error: "Trial plan not found." }, { status: 404 });
  }

  const trialDays = parseInt(await getSetting("trial_duration_days") ?? "7");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + trialDays);

  // Get default currency
  const currency = await db.currency.findFirst({ where: { enabled: true } });

  // Create the trial service
  const [service] = await db.$transaction([
    db.service.create({
      data: {
        userId: currentUser.id,
        productId: plan.productId,
        planId: plan.id,
        currencyCode: currency?.code ?? "INR",
        status: "active",
        price: 0,
        isTrial: true,
        expiresAt,
        label: `${plan.product.name} — Free Trial`,
      },
    }),
    db.user.update({
      where: { id: currentUser.id },
      data: { trialClaimedAt: new Date() },
    }),
  ]);

  // Notify
  sendNotification("invoice_created", currentUser.id, {
    invoiceNumber: "FREE TRIAL",
    amount: "0",
    currency: "INR",
    invoiceUrl: `/services/${service.id}`,
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    service: {
      id: service.id,
      productName: plan.product.name,
      planName: plan.name,
      expiresAt: expiresAt.toISOString(),
      trialDays,
    },
  });
}

export async function GET() {
  const currentUser = await getUser();
  if (!currentUser) return NextResponse.json({ eligible: false });

  const [user, trialPlanId] = await Promise.all([
    db.user.findUnique({ where: { id: currentUser.id }, select: { trialClaimedAt: true } }),
    getSetting("trial_plan_id"),
  ]);

  if (!trialPlanId) return NextResponse.json({ eligible: false, reason: "not_configured" });
  if (user?.trialClaimedAt) return NextResponse.json({ eligible: false, reason: "already_claimed", claimedAt: user.trialClaimedAt });

  const plan = await db.plan.findUnique({
    where: { id: trialPlanId },
    include: { product: { select: { name: true } } },
  });

  const days = parseInt(await getSetting("trial_duration_days") ?? "7");

  return NextResponse.json({
    eligible: true,
    planName: plan?.product.name ?? "Cloud Service",
    days,
  });
}

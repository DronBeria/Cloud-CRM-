import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    create: {
      name: "admin",
      permissions: ["admin", "users", "products", "invoices", "tickets", "settings"],
    },
    update: {},
  });

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    create: { name: "user", permissions: [] },
    update: {},
  });

  console.log("Created roles:", adminRole.name, userRole.name);

  // Create default admin user
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@cloudcrm.app" },
    create: {
      name: "Admin User",
      email: "admin@cloudcrm.app",
      password: adminPassword,
      roleId: adminRole.id,
      emailVerifiedAt: new Date(),
    },
    update: {},
  });

  console.log("Created admin user:", admin.email);

  // Create USD currency
  const usd = await prisma.currency.upsert({
    where: { code: "USD" },
    create: {
      code: "USD",
      name: "US Dollar",
      prefix: "$",
      suffix: "",
      exchangeRate: 1,
      enabled: true,
    },
    update: {},
  });

  // Create EUR currency
  await prisma.currency.upsert({
    where: { code: "EUR" },
    create: {
      code: "EUR",
      name: "Euro",
      prefix: "€",
      suffix: "",
      exchangeRate: 0.92,
      enabled: true,
    },
    update: {},
  });

  console.log("Created currencies");

  // Create sample categories
  const hosting = await prisma.category.upsert({
    where: { slug: "web-hosting" },
    create: { name: "Web Hosting", slug: "web-hosting", sort: 1 },
    update: {},
  });

  const vps = await prisma.category.upsert({
    where: { slug: "vps" },
    create: { name: "VPS Servers", slug: "vps", sort: 2 },
    update: {},
  });

  const domains = await prisma.category.upsert({
    where: { slug: "domains" },
    create: { name: "Domains", slug: "domains", sort: 3 },
    update: {},
  });

  console.log("Created categories");

  // Create sample products
  const sharedHosting = await prisma.product.upsert({
    where: { slug: "shared-hosting" },
    create: {
      name: "Shared Hosting",
      slug: "shared-hosting",
      description:
        "Perfect for small websites and blogs. Includes 10GB SSD storage, free SSL, and 24/7 support.",
      categoryId: hosting.id,
      hidden: false,
      sort: 1,
    },
    update: {},
  });

  const vpsBasic = await prisma.product.upsert({
    where: { slug: "vps-basic" },
    create: {
      name: "VPS Basic",
      slug: "vps-basic",
      description:
        "1 vCPU, 2GB RAM, 40GB NVMe SSD. Full root access with KVM virtualization.",
      categoryId: vps.id,
      hidden: false,
      sort: 1,
    },
    update: {},
  });

  const vpsAdvanced = await prisma.product.upsert({
    where: { slug: "vps-advanced" },
    create: {
      name: "VPS Advanced",
      slug: "vps-advanced",
      description:
        "2 vCPU, 4GB RAM, 80GB NVMe SSD. Ideal for medium-traffic applications.",
      categoryId: vps.id,
      hidden: false,
      sort: 2,
    },
    update: {},
  });

  console.log("Created products");

  // Create plans for shared hosting
  const sharedMonthly = await prisma.plan.upsert({
    where: { id: "shared-monthly" },
    create: {
      id: "shared-monthly",
      productId: sharedHosting.id,
      name: "Monthly",
      billingPeriod: 1,
      billingUnit: "month",
    },
    update: {},
  });

  const sharedAnnual = await prisma.plan.upsert({
    where: { id: "shared-annual" },
    create: {
      id: "shared-annual",
      productId: sharedHosting.id,
      name: "Annual",
      billingPeriod: 1,
      billingUnit: "year",
    },
    update: {},
  });

  // Create plans for VPS Basic
  const vpsBasicMonthly = await prisma.plan.upsert({
    where: { id: "vps-basic-monthly" },
    create: {
      id: "vps-basic-monthly",
      productId: vpsBasic.id,
      name: "Monthly",
      billingPeriod: 1,
      billingUnit: "month",
    },
    update: {},
  });

  const vpsBasicAnnual = await prisma.plan.upsert({
    where: { id: "vps-basic-annual" },
    create: {
      id: "vps-basic-annual",
      productId: vpsBasic.id,
      name: "Annual",
      billingPeriod: 1,
      billingUnit: "year",
    },
    update: {},
  });

  const vpsAdvancedMonthly = await prisma.plan.upsert({
    where: { id: "vps-advanced-monthly" },
    create: {
      id: "vps-advanced-monthly",
      productId: vpsAdvanced.id,
      name: "Monthly",
      billingPeriod: 1,
      billingUnit: "month",
    },
    update: {},
  });

  console.log("Created plans");

  // Create prices
  const planPrices = [
    { planId: sharedMonthly.id, price: 5.99, setupFee: 0 },
    { planId: sharedAnnual.id, price: 59.99, setupFee: 0 },
    { planId: vpsBasicMonthly.id, price: 9.99, setupFee: 0 },
    { planId: vpsBasicAnnual.id, price: 99.99, setupFee: 0 },
    { planId: vpsAdvancedMonthly.id, price: 19.99, setupFee: 0 },
  ];

  for (const pp of planPrices) {
    await prisma.price.upsert({
      where: { planId_currencyCode: { planId: pp.planId, currencyCode: "USD" } },
      create: {
        planId: pp.planId,
        currencyCode: "USD",
        price: pp.price,
        setupFee: pp.setupFee,
      },
      update: {},
    });
  }

  console.log("Created prices");

  // Create default notification templates
  const templates = [
    {
      key: "invoice.created",
      name: "Invoice Created",
      subject: "Invoice #{{invoice_number}} — {{amount}} Due",
      body: "<p>Hi {{name}},</p><p>Your invoice #{{invoice_number}} for {{amount}} is ready.</p>",
      enabled: true,
    },
    {
      key: "invoice.paid",
      name: "Invoice Paid",
      subject: "Payment Confirmed — Invoice #{{invoice_number}}",
      body: "<p>Hi {{name}},</p><p>Your payment of {{amount}} has been received.</p>",
      enabled: true,
    },
    {
      key: "ticket.replied",
      name: "Ticket Replied",
      subject: "Re: {{subject}} — Support Ticket",
      body: "<p>Hi {{name}},</p><p>Your support ticket has a new reply: {{message}}</p>",
      enabled: true,
    },
    {
      key: "service.suspended",
      name: "Service Suspended",
      subject: "Service Suspended: {{service_name}}",
      body: "<p>Hi {{name}},</p><p>Your service {{service_name}} has been suspended due to non-payment.</p>",
      enabled: true,
    },
  ];

  for (const tmpl of templates) {
    await prisma.notificationTemplate.upsert({
      where: { key: tmpl.key },
      create: tmpl,
      update: {},
    });
  }

  console.log("Created notification templates");

  // Create sample coupon
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    create: {
      code: "WELCOME10",
      type: "percent",
      value: 10,
      maxUses: 100,
      maxUsesPerUser: 1,
      used: 0,
      appliesTo: [],
    },
    update: {},
  });

  console.log("Created sample coupon: WELCOME10 (10% off)");
  console.log("\nSeed complete!");
  console.log("Admin login: admin@cloudcrm.app / Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

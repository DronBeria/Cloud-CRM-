export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { db } = await import("@/lib/db");
    const bcrypt = await import("bcryptjs");

    try {
      // Ensure roles exist
      const adminRole = await db.role.upsert({
        where: { name: "admin" },
        create: { name: "admin", permissions: ["*"] },
        update: {},
      });

      await db.role.upsert({
        where: { name: "user" },
        create: { name: "user", permissions: [] },
        update: {},
      });

      // Ensure default currency
      await db.currency.upsert({
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

      // Seed default settings
      const defaultSettings: Record<string, string> = {
        app_name: "CloudCRM",
        invoice_prefix: "INV",
        invoice_padding: "4",
        invoice_due_days: "7",
        billing_renewal_days: "7",
        billing_suspend_days: "2",
        billing_terminate_days: "14",
        tax_enabled: "false",
        tax_type: "exclusive",
        credits_enabled: "true",
        credits_auto_apply: "false",
        mail_enabled: "false",
        registration_enabled: "true",
      };

      for (const [key, value] of Object.entries(defaultSettings)) {
        const existing = await db.setting.findFirst({
          where: { key, settingableType: null, settingableId: null },
        });
        if (!existing) {
          await db.setting.create({ data: { key, value } });
        }
      }

      // Seed default notification templates
      const { seedNotificationTemplates } = await import("@/lib/notifications");
      await seedNotificationTemplates();

      // Create admin user if none exists
      const adminExists = await db.user.findFirst({
        where: { role: { name: "admin" } },
      });

      if (!adminExists) {
        const email = process.env.ADMIN_EMAIL ?? "admin@cloudcrm.app";
        const password = process.env.ADMIN_PASSWORD ?? "Admin123!";
        const hashed = await bcrypt.default.hash(password, 12);

        await db.user.upsert({
          where: { email },
          create: {
            name: "Administrator",
            email,
            password: hashed,
            roleId: adminRole.id,
            emailVerifiedAt: new Date(),
          },
          update: { roleId: adminRole.id },
        });

        console.log(`[startup] Admin created: ${email}`);
      }
    } catch (err) {
      console.error("[startup] Seed error:", err);
    }
  }
}

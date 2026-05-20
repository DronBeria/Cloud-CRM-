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
        where: { name: "manager" },
        create: { name: "manager", permissions: ["view", "create", "edit", "delete_client"] },
        update: {},
      });

      await db.role.upsert({
        where: { name: "user" },
        create: { name: "user", permissions: [] },
        update: {},
      });

      // Ensure currencies
      await db.currency.upsert({
        where: { code: "USD" },
        create: { code: "USD", name: "US Dollar", prefix: "$", suffix: "", exchangeRate: 1, enabled: true },
        update: {},
      });
      await db.currency.upsert({
        where: { code: "INR" },
        create: { code: "INR", name: "Indian Rupee", prefix: "₹", suffix: "", exchangeRate: 83.5, enabled: true },
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
        default_currency: "INR",
        inr_exchange_rate: "83.5",
        trial_duration_days: "7",
        trial_plan_id: "",
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

      // Create admin user if none exists (Prisma + Supabase)
      const adminExists = await db.user.findFirst({ where: { role: { name: "admin" } } });

      if (!adminExists) {
        const email = process.env.ADMIN_EMAIL ?? "admin@cloudcrm.app";
        const password = process.env.ADMIN_PASSWORD ?? "Admin123!";
        const hashed = await bcrypt.default.hash(password, 10);

        const adminUser = await db.user.upsert({
          where: { email },
          create: { name: "Administrator", email, password: hashed, roleId: adminRole.id, emailVerifiedAt: new Date() },
          update: { roleId: adminRole.id },
        });

        // Create in Supabase Auth with admin role
        try {
          const { createAuthUser } = await import("@/lib/supabase/auth");
          await createAuthUser({ email, password, name: "Administrator", role: "admin", prismaId: adminUser.id });
          console.log(`[startup] Admin created in Supabase: ${email}`);
        } catch (e) {
          console.error("[startup] Supabase admin creation failed:", e);
          console.log(`[startup] Admin Prisma user created: ${email} — run migration script to sync Supabase`);
        }
      }
    } catch (err) {
      console.error("[startup] Seed error:", err);
    }
  }
}

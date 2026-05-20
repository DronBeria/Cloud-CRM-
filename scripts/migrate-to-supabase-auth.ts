/**
 * One-time migration script: creates Supabase Auth users for all existing Prisma users.
 * Run once with: npx tsx scripts/migrate-to-supabase-auth.ts
 *
 * This links each Prisma user to a Supabase auth.users entry.
 * Role is set in app_metadata so it's available in the JWT (no DB call needed).
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function migrate() {
  console.log("Starting Supabase Auth migration...");

  const users = await db.user.findMany({
    include: { role: true },
  });

  console.log(`Found ${users.length} users to migrate`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const role = user.role?.name ?? "user";

    try {
      // Check if Supabase user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const exists = existingUsers.users.some((u) => u.email === user.email);

      if (exists) {
        // Update their app_metadata with prisma_id and role
        const existing = existingUsers.users.find((u) => u.email === user.email)!;
        await supabase.auth.admin.updateUserById(existing.id, {
          app_metadata: { role, prisma_id: user.id },
          user_metadata: { name: user.name },
        });
        console.log(`  Updated: ${user.email} (${role})`);
        skipped++;
        continue;
      }

      // Create new Supabase user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: `Temp${Math.random().toString(36).slice(2)}!`,
        email_confirm: true,
        user_metadata: { name: user.name },
        app_metadata: { role, prisma_id: user.id },
      });

      if (error) throw error;
      created++;
      console.log(`  Created: ${user.email} (${role})`);
    } catch (err) {
      failed++;
      console.error(`  FAILED: ${user.email}`, err);
    }

    // Rate limit: 10 requests/second
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nMigration complete: ${created} created, ${skipped} updated, ${failed} failed`);
  console.log("\nIMPORTANT: Users will need to reset their passwords via forgot-password.");
  await db.$disconnect();
}

migrate().catch(console.error);

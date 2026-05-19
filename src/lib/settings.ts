import { db } from "@/lib/db";

const cache = new Map<string, { value: string | null; ts: number }>();
const TTL = 60_000; // 1 minute cache

export async function getSetting(key: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.ts < TTL) return cached.value;

  try {
    const setting = await db.setting.findFirst({
      where: { key, settingableType: null, settingableId: null },
    });
    const value = setting?.value ?? null;
    cache.set(key, { value, ts: now });
    return value;
  } catch {
    return null;
  }
}

export async function getSettings(
  keys: string[]
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  await Promise.all(keys.map(async (k) => { result[k] = await getSetting(k); }));
  return result;
}

export async function setSetting(key: string, value: string): Promise<void> {
  cache.delete(key);
  const existing = await db.setting.findFirst({
    where: { key, settingableType: null, settingableId: null },
  });
  if (existing) {
    await db.setting.update({ where: { id: existing.id }, data: { value } });
  } else {
    await db.setting.create({ data: { key, value } });
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const settings = await db.setting.findMany({
      where: { settingableType: null },
    });
    return Object.fromEntries(
      settings.map((s) => [s.key, s.value ?? ""])
    );
  } catch {
    return {};
  }
}

// Typed helpers for common settings
export async function getBillingSettings() {
  const s = await getSettings([
    "invoice_prefix",
    "invoice_padding",
    "invoice_due_days",
    "billing_suspend_days",
    "billing_terminate_days",
    "billing_renewal_days",
    "company_name",
    "support_email",
    "billing_address",
    "default_currency",
    "tax_enabled",
    "tax_type",
  ]);
  return {
    invoicePrefix: s.invoice_prefix ?? "INV",
    invoicePadding: parseInt(s.invoice_padding ?? "4"),
    invoiceDueDays: parseInt(s.invoice_due_days ?? "7"),
    suspendDays: parseInt(s.billing_suspend_days ?? "2"),
    terminateDays: parseInt(s.billing_terminate_days ?? "14"),
    renewalDays: parseInt(s.billing_renewal_days ?? "7"),
    companyName: s.company_name ?? "CloudCRM",
    supportEmail: s.support_email ?? "",
    billingAddress: s.billing_address ?? "",
    defaultCurrency: s.default_currency ?? "USD",
    taxEnabled: s.tax_enabled === "true",
    taxType: s.tax_type ?? "exclusive",
  };
}

export async function getMailSettings() {
  const s = await getSettings([
    "mail_enabled",
    "mail_host",
    "mail_port",
    "mail_username",
    "mail_password",
    "mail_from_address",
    "mail_from_name",
    "mail_encryption",
  ]);
  return {
    enabled: s.mail_enabled === "true",
    host: s.mail_host ?? "",
    port: parseInt(s.mail_port ?? "587"),
    username: s.mail_username ?? "",
    password: s.mail_password ?? "",
    fromAddress: s.mail_from_address ?? "",
    fromName: s.mail_from_name ?? "CloudCRM",
    encryption: s.mail_encryption ?? "tls",
  };
}

export function clearSettingsCache() {
  cache.clear();
}

/**
 * TSplus Integration Library
 * Communicates with the CoCloud TSplus Agent running on the Windows Server.
 * All calls are authenticated with TSPLUS_AGENT_KEY.
 */

const AGENT_URL = process.env.TSPLUS_AGENT_URL ?? "";
const AGENT_KEY = process.env.TSPLUS_AGENT_KEY ?? "";

interface AgentResponse<T = unknown> {
  ok?: boolean;
  success?: boolean;
  error?: string;
  data?: T;
}

async function call<T>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  if (!AGENT_URL) throw new Error("TSplus agent not configured. Set TSPLUS_AGENT_URL.");

  const res = await fetch(`${AGENT_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AGENT_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Agent returned ${res.status}`);
  return data as T;
}

export interface ProvisionResult {
  username: string;
  password: string;
  tallyPath: string;
  dataPath: string;
  launchUrl: string;
  serverUrl: string;
}

export interface AccountInfo {
  serviceId: string;
  username: string;
  tallyPath: string;
  dataPath: string;
  clientName: string;
  planName: string;
  sessions: number;
  provisionedAt: string;
  status: "active" | "suspended";
}

export interface AgentStatus {
  ok: boolean;
  hostname: string;
  os: string;
  managedUsers: number;
  tallyBasePath: string;
}

// ── Provisioning ──────────────────────────────────────────────────────────────

export async function provisionService(params: {
  serviceId: string;
  clientName: string;
  planName: string;
  sessions?: number;
}): Promise<ProvisionResult> {
  return call<ProvisionResult>("POST", "/provision", params);
}

export async function suspendService(serviceId: string): Promise<void> {
  await call("POST", "/suspend", { serviceId });
}

export async function reactivateService(serviceId: string): Promise<void> {
  await call("POST", "/reactivate", { serviceId });
}

export async function deleteService(
  serviceId: string,
  deleteData = false
): Promise<void> {
  await call("DELETE", "/provision", { serviceId, deleteData });
}

export async function resetPassword(
  serviceId: string
): Promise<{ password: string }> {
  return call<{ password: string }>("POST", "/reset-password", { serviceId });
}

// ── Info ──────────────────────────────────────────────────────────────────────

export async function getAccountInfo(serviceId: string): Promise<AccountInfo> {
  return call<AccountInfo>("GET", `/account/${serviceId}`);
}

export async function listAccounts(): Promise<AccountInfo[]> {
  return call<AccountInfo[]>("GET", "/accounts");
}

export async function testConnection(): Promise<AgentStatus> {
  return call<AgentStatus>("GET", "/status");
}

export function isConfigured(): boolean {
  return Boolean(AGENT_URL && AGENT_KEY);
}

// ── Launch URL ────────────────────────────────────────────────────────────────

export function buildLaunchUrl(
  username: string,
  password: string,
  app = "tally.exe"
): string {
  const server = process.env.TSPLUS_SERVER_URL ?? AGENT_URL;
  const params = new URLSearchParams({
    username,
    password,
    remoteapp: app,
  });
  return `${server}/?${params.toString()}`;
}

// ── Product helper ────────────────────────────────────────────────────────────

// Detects if a product is a TSplus/RDP product by checking its slug or name
export function isTsplusProduct(productSlug: string): boolean {
  const keywords = ["tally", "rdp", "desktop", "tsplus", "cloud-pc", "cloudpc", "remote"];
  const lower = productSlug.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

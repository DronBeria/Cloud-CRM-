import { db } from "@/lib/db";

interface AuditParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function audit(params: AuditParams) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
        newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error("[Audit] Failed to log:", err);
  }
}

export const ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LOGIN: "login",
  LOGOUT: "logout",
  INVOICE_PAID: "invoice_paid",
  SERVICE_SUSPENDED: "service_suspended",
  SERVICE_CANCELLED: "service_cancelled",
  CLIENT_CREATED: "client_created",
  SETTINGS_UPDATED: "settings_updated",
} as const;

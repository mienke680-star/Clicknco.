import "server-only";
import { prisma } from "@/lib/db";

export interface AuditLogInput {
  companyId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/** Fire-and-forget audit trail write (the platform's Activity Log). Never throws into the caller's request. */
export async function writeAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: input.companyId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata as never,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log", input.action, err);
  }
}

export function requestMeta(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : (req.headers.get("x-real-ip") ?? null);
  const userAgent = req.headers.get("user-agent");
  return { ip, userAgent };
}

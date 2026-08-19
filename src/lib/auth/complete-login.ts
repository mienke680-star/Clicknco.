import "server-only";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { PlatformRole } from "@/generated/prisma/client";

/** Shared by password-only login and the 2FA verify step. Creates the real session. */
export async function completeLogin(
  user: { id: string; mustChangePassword: boolean; platformRole: PlatformRole },
  ip: string | null,
  userAgent: string | null,
) {
  let activeCompanyId: string | null = null;

  if (user.platformRole === PlatformRole.SUPER_ADMIN) {
    activeCompanyId = null;
  } else {
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    activeCompanyId = membership?.companyId ?? null;
  }

  await createSession(user.id, { activeCompanyId, ip, userAgent });
  await writeAuditLog({
    companyId: activeCompanyId,
    actorUserId: user.id,
    action: "user.login",
    ip,
    userAgent,
  });

  if (user.mustChangePassword) return "/force-password-change";
  if (user.platformRole === PlatformRole.SUPER_ADMIN) return "/admin";
  return "/portal";
}

import "server-only";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";

export type VerifyEmailResult = "verified" | "already_verified" | "invalid";

export async function consumeEmailVerificationToken(token: string): Promise<VerifyEmailResult> {
  const tokenRow = await prisma.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!tokenRow || tokenRow.type !== "EMAIL_VERIFY") return "invalid";

  const user = await prisma.user.findUnique({ where: { id: tokenRow.userId } });
  if (!user) return "invalid";
  if (user.emailVerifiedAt) return "already_verified";

  if (tokenRow.consumedAt || tokenRow.expiresAt.getTime() < Date.now()) return "invalid";

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: tokenRow.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
  ]);

  await writeAuditLog({ actorUserId: user.id, action: "user.email_verified" });
  return "verified";
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { acceptInviteSchema } from "@/lib/validation/auth";
import { hashPassword, checkPasswordStrength } from "@/lib/auth/password";
import { hashToken } from "@/lib/crypto";
import { createSession } from "@/lib/auth/session";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`accept-invite:${ip}`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const strength = checkPasswordStrength(parsed.data.password);
  if (!strength.valid) return NextResponse.json({ error: strength.errors[0] }, { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { inviteTokenHash: hashToken(parsed.data.token), status: "INVITED" },
    include: { user: true, company: true },
  });

  if (!membership || !membership.invitedAt || membership.invitedAt.getTime() + INVITE_TTL_MS < Date.now()) {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: membership.userId },
      data: {
        passwordHash,
        name: parsed.data.name?.trim() || membership.user.name,
        emailVerifiedAt: membership.user.emailVerifiedAt ?? new Date(),
      },
    }),
    prisma.membership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE", inviteTokenHash: null },
    }),
  ]);

  const { userAgent } = requestMeta(req);
  await createSession(membership.userId, { activeCompanyId: membership.companyId, ip, userAgent });
  await writeAuditLog({
    companyId: membership.companyId,
    actorUserId: membership.userId,
    action: "user.accepted_invite",
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true, redirectTo: "/portal", companyName: membership.company.portalName || membership.company.name });
}

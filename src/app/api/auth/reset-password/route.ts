import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { hashPassword, checkPasswordStrength } from "@/lib/auth/password";
import { hashToken } from "@/lib/crypto";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { sendMail } from "@/lib/mail/mailer";
import { passwordChangedTemplate } from "@/lib/mail/templates";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`reset-password:${ip}`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const strength = checkPasswordStrength(parsed.data.password);
  if (!strength.valid) return NextResponse.json({ error: strength.errors[0] }, { status: 400 });

  const tokenRow = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (
    !tokenRow ||
    tokenRow.type !== "PASSWORD_RESET" ||
    tokenRow.consumedAt ||
    tokenRow.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.update({
    where: { id: tokenRow.userId },
    data: { passwordHash, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
  });
  await prisma.verificationToken.update({ where: { id: tokenRow.id }, data: { consumedAt: new Date() } });
  await destroyAllSessionsForUser(user.id);

  const mail = passwordChangedTemplate(user.name);
  await sendMail({ to: user.email, subject: mail.subject, html: mail.html });

  const { userAgent } = requestMeta(req);
  await writeAuditLog({ actorUserId: user.id, action: "user.password_reset_completed", ip, userAgent });

  return NextResponse.json({ ok: true });
}

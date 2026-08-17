import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { completeLogin } from "@/lib/auth/complete-login";
import { createTwoFactorChallenge } from "@/lib/auth/challenge";
import { generateNumericCode } from "@/lib/crypto";
import { sendMail } from "@/lib/mail/mailer";
import { twoFactorCodeTemplate } from "@/lib/mail/templates";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const MAX_FAILED_ATTEMPTS = 6;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const { userAgent } = requestMeta(req);

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const rl = rateLimit(`login:${ip}:${email}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in a few minutes." }, { status: 429 });
  }

  const genericError = NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await writeAuditLog({ action: "user.login_failed", metadata: { email }, ip, userAgent });
    return genericError;
  }

  if (user.status === "SUSPENDED") {
    await writeAuditLog({ actorUserId: user.id, action: "user.login_blocked_suspended", ip, userAgent });
    return NextResponse.json({ error: "This account has been suspended. Contact support." }, { status: 403 });
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await writeAuditLog({ actorUserId: user.id, action: "user.login_blocked_locked", ip, userAgent });
    return NextResponse.json(
      { error: "Too many failed attempts. This account is temporarily locked — try again shortly." },
      { status: 403 },
    );
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil = failedLoginCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil } });
    await writeAuditLog({ actorUserId: user.id, action: "user.login_failed", ip, userAgent });
    return genericError;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  if (user.twoFactorEnabled && user.twoFactorMethod !== "NONE") {
    await createTwoFactorChallenge(user.id, user.twoFactorMethod);

    if (user.twoFactorMethod === "EMAIL") {
      const { code, hash } = generateNumericCode();
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          type: "TWO_FACTOR_EMAIL",
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      const mail = twoFactorCodeTemplate(code);
      await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
    }

    return NextResponse.json({ ok: true, twoFactorRequired: true, method: user.twoFactorMethod });
  }

  const redirectTo = await completeLogin(user, ip, userAgent);
  return NextResponse.json({ ok: true, redirectTo });
}

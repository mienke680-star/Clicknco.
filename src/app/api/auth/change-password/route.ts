import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validation/auth";
import { hashPassword, checkPasswordStrength, verifyPassword } from "@/lib/auth/password";
import { getSessionContext, destroyAllSessionsForUser, createSession, verifyCsrf } from "@/lib/auth/session";
import { sendMail } from "@/lib/mail/mailer";
import { passwordChangedTemplate } from "@/lib/mail/templates";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await verifyCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`change-password:${session.userId}`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const validCurrent = await verifyPassword(parsed.data.currentPassword, session.user.passwordHash);
  if (!validCurrent) return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });

  const strength = checkPasswordStrength(parsed.data.newPassword);
  if (!strength.valid) return NextResponse.json({ error: strength.errors[0] }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash, mustChangePassword: false },
  });

  // Kill every other session, then re-issue a fresh one for this device so the
  // user isn't logged out of the very tab they just used to change it in.
  await destroyAllSessionsForUser(session.userId);
  const { userAgent } = requestMeta(req);
  const redirectTo = session.user.platformRole === "SUPER_ADMIN" ? "/admin" : "/portal";
  await createSession(session.userId, { activeCompanyId: session.activeCompanyId, ip, userAgent });

  const mail = passwordChangedTemplate(session.user.name);
  await sendMail({ to: session.user.email, subject: mail.subject, html: mail.html });
  await writeAuditLog({
    companyId: session.activeCompanyId,
    actorUserId: session.userId,
    action: "user.password_changed",
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true, redirectTo });
}

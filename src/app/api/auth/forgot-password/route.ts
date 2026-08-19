import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { generateToken } from "@/lib/crypto";
import { sendMail } from "@/lib/mail/mailer";
import { resetPasswordTemplate } from "@/lib/mail/templates";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`forgot-password:${ip}`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  // Always respond with the same generic message so this endpoint can't be used to
  // enumerate registered email addresses.
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If an account exists for that email, we've sent a password reset link.",
  });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return genericResponse;

  const { token, hash } = generateToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: "PASSWORD_RESET",
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const mail = resetPasswordTemplate(user.name, token);
  await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
  await writeAuditLog({ actorUserId: user.id, action: "user.password_reset_requested", ip });

  return genericResponse;
}

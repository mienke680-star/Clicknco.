import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionContext } from "@/lib/auth/session";
import { generateToken } from "@/lib/crypto";
import { sendMail } from "@/lib/mail/mailer";
import { verifyEmailTemplate } from "@/lib/mail/templates";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  const rl = rateLimit(`resend-verify:${session.userId}`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  await prisma.verificationToken.updateMany({
    where: { userId: session.userId, type: "EMAIL_VERIFY", consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const { token, hash } = generateToken();
  await prisma.verificationToken.create({
    data: {
      userId: session.userId,
      type: "EMAIL_VERIFY",
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const mail = verifyEmailTemplate(session.user.name, token);
  await sendMail({ to: session.user.email, subject: mail.subject, html: mail.html });

  return NextResponse.json({ ok: true });
}

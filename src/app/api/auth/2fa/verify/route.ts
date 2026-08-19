import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { twoFactorVerifySchema } from "@/lib/validation/auth";
import { readTwoFactorChallenge, clearTwoFactorChallenge } from "@/lib/auth/challenge";
import { completeLogin } from "@/lib/auth/complete-login";
import { verifyTotp } from "@/lib/auth/twofactor";
import { decrypt, hashToken } from "@/lib/crypto";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const { userAgent } = requestMeta(req);

  const rl = rateLimit(`2fa:${ip}`, RATE_LIMITS.twoFactor.limit, RATE_LIMITS.twoFactor.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const challenge = await readTwoFactorChallenge();
  if (!challenge) {
    return NextResponse.json({ error: "Your session expired. Please log in again." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = twoFactorVerifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  const code = parsed.data.code.replace(/\s+/g, "");

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

  let valid = false;

  if (challenge.method === "TOTP" && user.twoFactorSecret) {
    valid = await verifyTotp(code, decrypt(user.twoFactorSecret));
  } else if (challenge.method === "EMAIL") {
    const tokenRow = await prisma.verificationToken.findFirst({
      where: { userId: user.id, type: "TWO_FACTOR_EMAIL", consumedAt: null, tokenHash: hashToken(code) },
    });
    if (tokenRow && tokenRow.expiresAt.getTime() > Date.now()) {
      await prisma.verificationToken.update({ where: { id: tokenRow.id }, data: { consumedAt: new Date() } });
      valid = true;
    }
  }

  if (!valid) {
    await writeAuditLog({ actorUserId: user.id, action: "user.2fa_failed", ip, userAgent });
    return NextResponse.json({ error: "That code isn't valid. Please try again." }, { status: 401 });
  }

  await clearTwoFactorChallenge();
  const redirectTo = await completeLogin(user, ip, userAgent);
  return NextResponse.json({ ok: true, redirectTo });
}

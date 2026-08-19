import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionContext, verifyCsrf } from "@/lib/auth/session";
import { generateTotpSecret, getTotpUri, getTotpQrCodeDataUrl } from "@/lib/auth/twofactor";
import { encrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: session.userId },
    data: { twoFactorSecret: encrypt(secret) },
  });

  const uri = getTotpUri(session.user.email, secret);
  const qrCodeDataUrl = await getTotpQrCodeDataUrl(uri);

  return NextResponse.json({ ok: true, secret, qrCodeDataUrl });
}

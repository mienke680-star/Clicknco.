import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionContext, verifyCsrf } from "@/lib/auth/session";
import { twoFactorVerifySchema } from "@/lib/validation/auth";
import { verifyTotp } from "@/lib/auth/twofactor";
import { decrypt } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  if (!session.user.twoFactorSecret) {
    return NextResponse.json({ error: "Start setup again — no pending authenticator was found." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = twoFactorVerifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const valid = await verifyTotp(parsed.data.code.replace(/\s+/g, ""), decrypt(session.user.twoFactorSecret));
  if (!valid) return NextResponse.json({ error: "That code isn't valid. Please try again." }, { status: 400 });

  await prisma.user.update({
    where: { id: session.userId },
    data: { twoFactorEnabled: true, twoFactorMethod: "TOTP" },
  });
  await writeAuditLog({
    companyId: session.activeCompanyId,
    actorUserId: session.userId,
    action: "user.2fa_enabled",
    metadata: { method: "TOTP" },
  });

  return NextResponse.json({ ok: true });
}

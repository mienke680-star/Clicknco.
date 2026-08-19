import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionContext, verifyCsrf } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { twoFactorEnabled: true, twoFactorMethod: "EMAIL", twoFactorSecret: null },
  });
  await writeAuditLog({
    companyId: session.activeCompanyId,
    actorUserId: session.userId,
    action: "user.2fa_enabled",
    metadata: { method: "EMAIL" },
  });

  return NextResponse.json({ ok: true });
}

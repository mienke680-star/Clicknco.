import { NextResponse } from "next/server";
import { getSessionContext, destroySession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await getSessionContext();
  if (session) {
    await writeAuditLog({
      companyId: session.activeCompanyId,
      actorUserId: session.userId,
      action: "user.logout",
    });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionContext, verifyCsrf } from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/validation/auth";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { name: parsed.data.name },
    select: { id: true, name: true, email: true },
  });

  await writeAuditLog({ companyId: session.activeCompanyId, actorUserId: session.userId, action: "user.profile_updated" });

  return NextResponse.json({ user });
}

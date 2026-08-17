import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionContext, verifyCsrf, setActiveCompany } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

/** Lets Super Admin enter any company, or a multi-company staff user switch between
 * companies they actually belong to. */
export async function POST(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const companyId = body?.companyId;
  if (typeof companyId !== "string") {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const isSuperAdmin = session.user.platformRole === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const membership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: session.userId, companyId } },
    });
    if (!membership || membership.status !== "ACTIVE") {
      return NextResponse.json({ error: "You don't have access to that company." }, { status: 403 });
    }
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  await setActiveCompany(session.id, companyId);
  await writeAuditLog({
    companyId,
    actorUserId: session.userId,
    action: isSuperAdmin ? "admin.enter_company" : "user.switch_company",
  });

  return NextResponse.json({ ok: true });
}

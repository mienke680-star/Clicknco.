import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { updateMemberSchema } from "@/lib/validation/companies";
import { writeAuditLog, requestMeta } from "@/lib/audit";

async function isLastActiveAdmin(companyId: string, membershipId: string) {
  const activeAdmins = await prisma.membership.count({ where: { companyId, role: "ADMIN", status: "ACTIVE" } });
  if (activeAdmins > 1) return false;
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  return Boolean(membership && membership.role === "ADMIN" && membership.status === "ACTIVE");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id, membershipId } = await params;

  const existing = await prisma.membership.findFirst({ where: { id: membershipId, companyId: id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const demoting = data.role === "STAFF" || data.status === "SUSPENDED";
  if (demoting && (await isLastActiveAdmin(id, membershipId))) {
    return NextResponse.json({ error: "This is the only active admin for this company — add another admin first." }, { status: 400 });
  }

  if (data.staffRoleId) {
    const role = await prisma.staffRole.findFirst({ where: { id: data.staffRoleId, companyId: id } });
    if (!role) return NextResponse.json({ error: "That staff role doesn't belong to this company." }, { status: 400 });
  }

  const membership = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.staffRoleId !== undefined ? { staffRoleId: data.staffRoleId || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, lastLoginAt: true } }, staffRole: { select: { id: true, name: true } } },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: id,
    actorUserId: session.user.id,
    action: "member.updated",
    targetType: "Membership",
    targetId: membershipId,
    ip,
    userAgent,
  });

  return NextResponse.json({ membership });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id, membershipId } = await params;

  const existing = await prisma.membership.findFirst({ where: { id: membershipId, companyId: id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (await isLastActiveAdmin(id, membershipId)) {
    return NextResponse.json({ error: "This is the only active admin for this company — add another admin first." }, { status: 400 });
  }

  await prisma.membership.delete({ where: { id: membershipId } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: id,
    actorUserId: session.user.id,
    action: "member.removed",
    targetType: "Membership",
    targetId: membershipId,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}

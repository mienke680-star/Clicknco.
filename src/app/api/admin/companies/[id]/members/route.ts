import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { inviteMemberSchema } from "@/lib/validation/companies";
import { inviteMember } from "@/lib/companies/invite";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id } = await params;

  const company = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.staffRoleId) {
    const role = await prisma.staffRole.findFirst({ where: { id: data.staffRoleId, companyId: id } });
    if (!role) return NextResponse.json({ error: "That staff role doesn't belong to this company." }, { status: 400 });
  }

  let result;
  try {
    result = await inviteMember({
      companyId: id,
      companyName: company.name,
      name: data.name,
      email: data.email,
      role: data.role,
      staffRoleId: data.staffRoleId || null,
      invitedByUserId: session.user.id,
      invitedByName: session.user.name,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't add that member." }, { status: 409 });
  }

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: id,
    actorUserId: session.user.id,
    action: "member.invited",
    targetType: "Membership",
    targetId: result.membershipId,
    metadata: { email: data.email, role: data.role },
    ip,
    userAgent,
  });

  const membership = await prisma.membership.findUnique({
    where: { id: result.membershipId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, lastLoginAt: true } }, staffRole: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ membership, createdNewUser: result.createdNewUser }, { status: 201 });
}

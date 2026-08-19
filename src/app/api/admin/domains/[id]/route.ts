import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { domainActionSchema } from "@/lib/validation/domains";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id } = await params;

  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = domainActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const companyInclude = { company: { select: { id: true, name: true } } } as const;

  let updated;
  switch (parsed.data.action) {
    case "verify-dns":
      updated = await prisma.domain.update({ where: { id }, data: { dnsStatus: "VERIFIED", verifiedAt: new Date() }, include: companyInclude });
      break;
    case "fail-dns":
      updated = await prisma.domain.update({ where: { id }, data: { dnsStatus: "FAILED" }, include: companyInclude });
      break;
    case "activate-ssl":
      if (domain.dnsStatus !== "VERIFIED") {
        return NextResponse.json({ error: "Verify DNS before activating SSL." }, { status: 400 });
      }
      updated = await prisma.domain.update({ where: { id }, data: { sslStatus: "ACTIVE" }, include: companyInclude });
      break;
    case "set-primary":
      updated = await prisma.$transaction(async (tx) => {
        await tx.domain.updateMany({ where: { companyId: domain.companyId, id: { not: id } }, data: { isPrimary: false } });
        return tx.domain.update({ where: { id }, data: { isPrimary: true }, include: companyInclude });
      });
      break;
  }

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: domain.companyId,
    actorUserId: session.user.id,
    action: `domain.${parsed.data.action}`,
    targetType: "Domain",
    targetId: id,
    ip,
    userAgent,
  });

  return NextResponse.json({ domain: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { id } = await params;

  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  await prisma.domain.delete({ where: { id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: domain.companyId,
    actorUserId: session.user.id,
    action: "domain.removed",
    targetType: "Domain",
    targetId: id,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}

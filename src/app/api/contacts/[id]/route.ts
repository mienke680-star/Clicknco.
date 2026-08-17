import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { contactSchema } from "@/lib/validation/contacts";
import { writeAuditLog, requestMeta } from "@/lib/audit";

async function loadContact(companyId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, companyId },
    include: {
      tags: { include: { tag: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } },
      customFieldValues: { include: { customField: true } },
      assignedUser: { select: { id: true, name: true } },
      tasks: { orderBy: { createdAt: "desc" }, take: 20 },
      pipelineCards: { include: { pipeline: true, stage: true } },
      formSubmissions: { orderBy: { createdAt: "desc" }, take: 20, include: { form: true } },
      moduleRecords: { include: { module: true } },
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "contacts", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const contact = await loadContact(ctx.company.id, id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activity = await prisma.auditLog.findMany({
    where: { companyId: ctx.company.id, targetType: "Contact", targetId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { actor: { select: { name: true } } },
  });

  return NextResponse.json({ contact, activity });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "contacts", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.contact.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { tagIds, ...data } = parsed.data;

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.company !== undefined ? { company: data.company || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.leadSource !== undefined ? { leadSource: data.leadSource || null } : {}),
      ...(data.status !== undefined ? { status: data.status || "Lead" } : {}),
      ...(data.assignedUserId !== undefined ? { assignedUserId: data.assignedUserId || null } : {}),
      ...(tagIds !== undefined ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      lastActivityAt: new Date(),
    },
    include: { tags: { include: { tag: true } } },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "contact.updated",
    targetType: "Contact",
    targetId: id,
    ip,
    userAgent,
  });

  return NextResponse.json({ contact });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "contacts", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.contact.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contact.delete({ where: { id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "contact.deleted",
    targetType: "Contact",
    targetId: id,
    metadata: { name: `${existing.firstName} ${existing.lastName ?? ""}`.trim() },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { pipelineCardSchema, moveCardSchema } from "@/lib/validation/pipelines";
import { assertContactInCompany, assertStageInCompany, assertUserInCompany } from "@/lib/tenant-refs";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { runAutomationTrigger } from "@/lib/automation/engine";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.pipelineCard.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);

  // Drag-and-drop move (stage/status/order only) vs. full edit form use the same
  // endpoint with different payload shapes — try the narrower schema first.
  const move = moveCardSchema.safeParse(body);
  const full = pipelineCardSchema.partial().safeParse(body);

  const data: Record<string, unknown> = {};
  if (move.success) {
    if (move.data.stageId) data.stageId = move.data.stageId;
    if (move.data.status) data.status = move.data.status;
    if (move.data.sortOrder !== undefined) data.sortOrder = move.data.sortOrder;
  }
  if (full.success) {
    const { stageId, ...rest } = full.data;
    if (stageId) data.stageId = stageId;
    if (rest.title !== undefined) data.title = rest.title;
    if (rest.value !== undefined) data.value = rest.value;
    if (rest.contactId !== undefined) data.contactId = rest.contactId || null;
    if (rest.assignedUserId !== undefined) data.assignedUserId = rest.assignedUserId || null;
    if (rest.dueDate !== undefined) data.dueDate = rest.dueDate ? new Date(rest.dueDate) : null;
    if (rest.notes !== undefined) data.notes = rest.notes || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const refError =
    (await assertStageInCompany(ctx.company.id, data.stageId as string | undefined)) ??
    (await assertContactInCompany(ctx.company.id, data.contactId as string | undefined)) ??
    (await assertUserInCompany(ctx.company.id, data.assignedUserId as string | undefined));
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const card = await prisma.pipelineCard.update({
    where: { id },
    data,
    include: { contact: { select: { id: true, firstName: true, lastName: true } }, assignedUser: { select: { id: true, name: true } } },
  });

  const { ip, userAgent } = requestMeta(req);
  const stageChanged = typeof data.stageId === "string" && data.stageId !== existing.stageId;
  if (stageChanged) {
    await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "pipelinecard.stage_changed", targetType: "PipelineCard", targetId: id, ip, userAgent });
    await runAutomationTrigger(ctx.company.id, "STATUS_CHANGED", { moduleKey: "pipelines", contactId: card.contactId ?? undefined });
  }

  return NextResponse.json({ card });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.pipelineCard.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.pipelineCard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

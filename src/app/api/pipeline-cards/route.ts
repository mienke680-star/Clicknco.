import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { pipelineCardSchema } from "@/lib/validation/pipelines";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = pipelineCardSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const stage = await prisma.pipelineStage.findFirst({
    where: { id: parsed.data.stageId, pipeline: { id: parsed.data.pipelineId, companyId: ctx.company.id } },
  });
  if (!stage) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  const maxSort = await prisma.pipelineCard.aggregate({ where: { stageId: stage.id }, _max: { sortOrder: true } });

  const card = await prisma.pipelineCard.create({
    data: {
      companyId: ctx.company.id,
      pipelineId: parsed.data.pipelineId,
      stageId: parsed.data.stageId,
      title: parsed.data.title,
      value: parsed.data.value ?? null,
      contactId: parsed.data.contactId || null,
      assignedUserId: parsed.data.assignedUserId || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
    include: { contact: { select: { id: true, firstName: true, lastName: true } }, assignedUser: { select: { id: true, name: true } } },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "pipelinecard.created", targetType: "PipelineCard", targetId: card.id, ip, userAgent });

  return NextResponse.json({ card }, { status: 201 });
}

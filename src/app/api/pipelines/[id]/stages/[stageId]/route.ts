import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

async function loadStage(companyId: string, pipelineId: string, stageId: string) {
  return prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId, pipeline: { companyId } } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id, stageId } = await params;

  const stage = await loadStage(ctx.company.id, id, stageId);
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { name?: string; order?: number; color?: string } = {};
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body?.order === "number") data.order = body.order;
  if (typeof body?.color === "string") data.color = body.color;

  const updated = await prisma.pipelineStage.update({ where: { id: stageId }, data });
  return NextResponse.json({ stage: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id, stageId } = await params;

  const stage = await loadStage(ctx.company.id, id, stageId);
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cardCount = await prisma.pipelineCard.count({ where: { stageId } });
  if (cardCount > 0) {
    return NextResponse.json({ error: "Move or delete the cards in this stage first." }, { status: 409 });
  }

  await prisma.pipelineStage.delete({ where: { id: stageId } });
  return NextResponse.json({ ok: true });
}

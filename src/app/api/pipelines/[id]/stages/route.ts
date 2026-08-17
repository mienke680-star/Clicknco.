import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { stageSchema } from "@/lib/validation/pipelines";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const pipeline = await prisma.pipeline.findFirst({ where: { id, companyId: ctx.company.id }, include: { stages: true } });
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = stageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const stage = await prisma.pipelineStage.create({
    data: {
      pipelineId: id,
      name: parsed.data.name,
      color: parsed.data.color || "#3D5670",
      order: pipeline.stages.length,
    },
  });

  return NextResponse.json({ stage }, { status: 201 });
}

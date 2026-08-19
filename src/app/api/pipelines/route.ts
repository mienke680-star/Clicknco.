import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { pipelineSchema } from "@/lib/validation/pipelines";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "pipelines", action: "view" });
  if (isApiError(ctx)) return ctx;

  const pipelines = await prisma.pipeline.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "asc" },
    include: {
      stages: { orderBy: { order: "asc" } },
      cards: {
        where: { status: "OPEN" },
        orderBy: { sortOrder: "asc" },
        include: { contact: { select: { id: true, firstName: true, lastName: true } }, assignedUser: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ pipelines });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = pipelineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const stageNames = parsed.data.stageNames?.length ? parsed.data.stageNames : ["New", "In Progress", "Done"];

  const pipeline = await prisma.pipeline.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      stages: { create: stageNames.map((name, i) => ({ name, order: i })) },
    },
    include: { stages: { orderBy: { order: "asc" } }, cards: true },
  });

  return NextResponse.json({ pipeline }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { updateWorkflowSchema } from "@/lib/validation/automations";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import type { WorkflowGraph } from "@/lib/automation/graph-types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "automations", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 20, include: { contact: { select: { id: true, firstName: true, lastName: true } } } } },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ workflow });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "automations", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.workflow.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.triggerType !== undefined) data.triggerType = parsed.data.triggerType;
  if (parsed.data.triggerConfig !== undefined) data.triggerConfig = parsed.data.triggerConfig as Prisma.InputJsonValue;
  if (parsed.data.steps !== undefined) {
    const graph: WorkflowGraph = { steps: parsed.data.steps };
    data.graph = graph as unknown as Prisma.InputJsonValue;
  }

  const workflow = await prisma.workflow.update({ where: { id }, data });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "workflow.updated", targetType: "Workflow", targetId: id, ip, userAgent });

  return NextResponse.json({ workflow });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "automations", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.workflow.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workflow.delete({ where: { id } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "workflow.deleted", targetType: "Workflow", targetId: id, metadata: { name: existing.name }, ip, userAgent });

  return NextResponse.json({ ok: true });
}

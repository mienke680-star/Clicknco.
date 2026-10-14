import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { milestoneUpdateSchema } from "@/lib/validation/clickco";
import { getProjectById } from "@/lib/clickco/projects";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "projects", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id, milestoneId } = await params;

  const project = await prisma.project.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestone = await prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId: id } });
  if (!milestone) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = milestoneUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.projectMilestone.update({ where: { id: milestoneId }, data: { done: parsed.data.done } });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "project.milestone_toggled",
    targetType: "Project",
    targetId: id,
    metadata: { milestoneId, label: milestone.label, done: parsed.data.done },
    ip,
    userAgent,
  });

  const full = await getProjectById(ctx.company.id, id);
  return NextResponse.json({ project: full });
}

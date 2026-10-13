import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { projectUpdateSchema } from "@/lib/validation/clickco";
import { getProjectById } from "@/lib/clickco/projects";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "projects", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const project = await getProjectById(ctx.company.id, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "projects", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.project.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { stage, dueDate, waitingNote } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        ...(stage ? { stage } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(waitingNote !== undefined ? { waitingNote: waitingNote || null } : {}),
      },
    });
    // Matches hub.js: moving a project to Launched marks every milestone done.
    if (stage === "LAUNCHED") {
      await tx.projectMilestone.updateMany({ where: { projectId: id }, data: { done: true } });
    }
  });

  if (stage && stage !== existing.stage) {
    const { ip, userAgent } = requestMeta(req);
    await writeAuditLog({
      companyId: ctx.company.id,
      actorUserId: ctx.user.id,
      action: "project.stage_changed",
      targetType: "Project",
      targetId: id,
      metadata: { from: existing.stage, to: stage },
      ip,
      userAgent,
    });
  }

  const full = await getProjectById(ctx.company.id, id);
  return NextResponse.json({ project: full });
}

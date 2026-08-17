import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { taskSchema } from "@/lib/validation/tasks";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "tasks", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      assignedUser: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      relatedContact: { select: { id: true, firstName: true, lastName: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ task });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "tasks", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.task.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = taskSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const data = parsed.data;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.assignedUserId !== undefined ? { assignedUserId: data.assignedUserId || null } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.relatedContactId !== undefined ? { relatedContactId: data.relatedContactId || null } : {}),
    },
    include: {
      assignedUser: { select: { id: true, name: true } },
      relatedContact: { select: { id: true, firstName: true, lastName: true } },
      comments: { select: { id: true } },
    },
  });

  const { ip, userAgent } = requestMeta(req);
  if (data.status && data.status !== existing.status) {
    await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: data.status === "COMPLETED" ? "task.completed" : "task.status_changed", targetType: "Task", targetId: id, ip, userAgent });
  }

  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "tasks", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.task.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { taskSchema } from "@/lib/validation/tasks";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { runAutomationTrigger } from "@/lib/automation/engine";
import type { Prisma, TaskStatus, TaskPriority } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "tasks", action: "view" });
  if (isApiError(ctx)) return ctx;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const assignedUserId = sp.get("assignedUserId");
  const priority = sp.get("priority");

  const where: Prisma.TaskWhereInput = {
    companyId: ctx.company.id,
    ...(status ? { status: status as TaskStatus } : {}),
    ...(assignedUserId ? { assignedUserId } : {}),
    ...(priority ? { priority: priority as TaskPriority } : {}),
  };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: {
      assignedUser: { select: { id: true, name: true } },
      relatedContact: { select: { id: true, firstName: true, lastName: true } },
      comments: { select: { id: true } },
    },
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "tasks", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      companyId: ctx.company.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      assignedUserId: parsed.data.assignedUserId || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority || "MEDIUM",
      status: parsed.data.status || "TODO",
      relatedContactId: parsed.data.relatedContactId || null,
      createdByUserId: ctx.user.id,
    },
    include: {
      assignedUser: { select: { id: true, name: true } },
      relatedContact: { select: { id: true, firstName: true, lastName: true } },
      comments: { select: { id: true } },
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "task.created", targetType: "Task", targetId: task.id, ip, userAgent });

  if (task.assignedUserId && task.assignedUserId !== ctx.user.id) {
    await notify({ companyId: ctx.company.id, userId: task.assignedUserId, type: "TASK_ASSIGNED", title: `New task: ${task.title}`, link: `/portal/tasks?open=${task.id}` });
  }
  await runAutomationTrigger(ctx.company.id, "RECORD_CREATED", { taskId: task.id, moduleKey: "tasks" });

  return NextResponse.json({ task }, { status: 201 });
}

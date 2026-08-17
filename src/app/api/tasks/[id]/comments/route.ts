import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { taskCommentSchema } from "@/lib/validation/tasks";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "tasks", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const task = await prisma.task.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = taskCommentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorUserId: ctx.user.id, body: parsed.data.body },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

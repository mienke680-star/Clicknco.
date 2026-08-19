import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { createWorkflowSchema } from "@/lib/validation/automations";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "automations", action: "view" });
  if (isApiError(ctx)) return ctx;

  const workflows = await prisma.workflow.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { runs: true } } },
  });

  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "automations", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      triggerType: parsed.data.triggerType,
      triggerConfig: parsed.data.triggerConfig as Prisma.InputJsonValue | undefined,
      status: "DRAFT",
      graph: { steps: [] },
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "workflow.created", targetType: "Workflow", targetId: workflow.id, ip, userAgent });

  return NextResponse.json({ workflow }, { status: 201 });
}

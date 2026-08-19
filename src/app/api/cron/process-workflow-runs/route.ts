import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { advanceWorkflowRun } from "@/lib/automation/executor";

/** Resumes any WorkflowRun paused at a DELAY step whose wait has elapsed.
 * Call on a schedule with `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.scheduledAction.findMany({
    where: { executedAt: null, runAt: { lte: new Date() } },
    take: 100,
  });

  for (const action of due) {
    await prisma.scheduledAction.update({ where: { id: action.id }, data: { executedAt: new Date() } });
    await advanceWorkflowRun(action.workflowRunId, action.nodeId);
  }

  return NextResponse.json({ processed: due.length });
}

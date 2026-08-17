import "server-only";
import { prisma } from "@/lib/db";
import type { WorkflowTriggerType } from "@/generated/prisma/client";

export interface TriggerPayload {
  contactId?: string;
  moduleKey?: string;
  moduleRecordId?: string;
  taskId?: string;
  [key: string]: unknown;
}

/**
 * Entry point called by every mutation that can fire an automation (contact
 * created, form submitted, status changed, etc). Finds matching ACTIVE
 * workflows and starts a run for each. The graph-walking executor (actions,
 * conditions, delays) is implemented in full alongside the workflow builder
 * UI — this already does the real trigger matching + run bookkeeping so nothing
 * needs to change at the call sites once the executor lands.
 */
export async function runAutomationTrigger(companyId: string, triggerType: WorkflowTriggerType, payload: TriggerPayload) {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { companyId, status: "ACTIVE", triggerType },
    });
    if (workflows.length === 0) return;

    for (const workflow of workflows) {
      if (!matchesTriggerConfig(workflow.triggerConfig, payload)) continue;
      await prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          contactId: payload.contactId ?? null,
          status: "RUNNING",
        },
      });
      // Actual node execution (send email/create task/update record/etc.) picks up
      // queued runs — see src/lib/automation/executor.ts once the workflow builder ships.
    }
  } catch (err) {
    console.error("runAutomationTrigger failed", triggerType, err);
  }
}

function matchesTriggerConfig(triggerConfig: unknown, payload: TriggerPayload): boolean {
  if (!triggerConfig || typeof triggerConfig !== "object") return true;
  const config = triggerConfig as Record<string, unknown>;
  if (config.moduleKey && config.moduleKey !== payload.moduleKey) return false;
  return true;
}

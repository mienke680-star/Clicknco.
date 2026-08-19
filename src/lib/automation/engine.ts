import "server-only";
import { prisma } from "@/lib/db";
import type { WorkflowTriggerType } from "@/generated/prisma/client";
import { advanceWorkflowRun } from "./executor";

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
 * workflows, starts a run for each, and immediately advances it through the
 * graph up to the first delay (or the end).
 */
export async function runAutomationTrigger(companyId: string, triggerType: WorkflowTriggerType, payload: TriggerPayload) {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { companyId, status: "ACTIVE", triggerType },
    });
    if (workflows.length === 0) return;

    for (const workflow of workflows) {
      if (!matchesTriggerConfig(workflow.triggerConfig, payload)) continue;
      const run = await prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          contactId: payload.contactId ?? null,
          status: "RUNNING",
        },
      });
      await advanceWorkflowRun(run.id);
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

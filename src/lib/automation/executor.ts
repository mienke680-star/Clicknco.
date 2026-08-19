import "server-only";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail/mailer";
import { applyMergeFields } from "@/lib/mail/merge";
import type { WorkflowGraph } from "./graph-types";

const MS_PER_UNIT: Record<"minutes" | "hours" | "days", number> = {
  minutes: 60_000,
  hours: 60 * 60_000,
  days: 24 * 60 * 60_000,
};

/** Advances a WorkflowRun through its graph's steps starting after
 * `fromStepId` (or from the top when null), executing actions/conditions
 * synchronously and stopping at the first DELAY step (scheduling a
 * ScheduledAction to resume later) or the end of the graph. */
export async function advanceWorkflowRun(runId: string, fromStepId: string | null = null) {
  const run = await prisma.workflowRun.findUnique({ where: { id: runId }, include: { workflow: true } });
  if (!run || run.status !== "RUNNING") return;

  const graph = run.workflow.graph as unknown as WorkflowGraph;
  const steps = graph?.steps ?? [];
  const startIndex = fromStepId ? steps.findIndex((s) => s.id === fromStepId) + 1 : 0;

  const contact = run.contactId ? await prisma.contact.findUnique({ where: { id: run.contactId } }) : null;

  for (let i = Math.max(startIndex, 0); i < steps.length; i++) {
    const step = steps[i]!;

    try {
      if (step.kind === "CONDITION") {
        const actual = contact ? String((contact as unknown as Record<string, unknown>)[step.field] ?? "") : "";
        const matches = step.operator === "equals" ? actual === step.value : actual !== step.value;
        if (!matches) {
          await prisma.workflowRun.update({ where: { id: runId }, data: { status: "CANCELLED", completedAt: new Date(), currentNodeId: step.id } });
          return;
        }
      } else if (step.kind === "SEND_EMAIL" && contact?.email) {
        const template = await prisma.emailTemplate.findUnique({ where: { id: step.templateId } });
        if (template) {
          const subject = applyMergeFields(template.subject, contact);
          const html = applyMergeFields(template.body, contact);
          const result = await sendMail({ to: contact.email, subject, html });
          await prisma.emailMessage.create({
            data: {
              companyId: run.workflow.companyId,
              contactId: contact.id,
              toEmail: contact.email,
              subject,
              body: html,
              status: result.delivered || result.dev ? "SENT" : "FAILED",
              sentAt: new Date(),
              triggeredBy: "automation",
            },
          });
        }
      } else if (step.kind === "CREATE_TASK") {
        await prisma.task.create({
          data: {
            companyId: run.workflow.companyId,
            title: contact ? applyMergeFields(step.title, contact) : step.title,
            assignedUserId: step.assignedUserId || null,
            relatedContactId: run.contactId,
          },
        });
      } else if (step.kind === "ADD_TAG" && run.contactId) {
        const tag = await prisma.tag.upsert({
          where: { companyId_name: { companyId: run.workflow.companyId, name: step.tagName } },
          update: {},
          create: { companyId: run.workflow.companyId, name: step.tagName },
        });
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId: run.contactId, tagId: tag.id } },
          update: {},
          create: { contactId: run.contactId, tagId: tag.id },
        });
      } else if (step.kind === "SEND_NOTIFICATION") {
        await prisma.notification.create({
          data: {
            companyId: run.workflow.companyId,
            type: "SYSTEM",
            title: contact ? applyMergeFields(step.title, contact) : step.title,
            link: run.contactId ? `/portal/contacts/${run.contactId}` : undefined,
          },
        });
      } else if (step.kind === "DELAY") {
        const runAt = new Date(Date.now() + step.amount * MS_PER_UNIT[step.unit]);
        await prisma.scheduledAction.create({ data: { workflowRunId: runId, nodeId: step.id, runAt } });
        await prisma.workflowRun.update({ where: { id: runId }, data: { currentNodeId: step.id } });
        return; // pause here — resumed by the cron processor once runAt arrives
      }
    } catch (err) {
      console.error(`Workflow step ${step.kind} failed in run ${runId}`, err);
    }
  }

  await prisma.workflowRun.update({ where: { id: runId }, data: { status: "COMPLETED", completedAt: new Date(), currentNodeId: null } });
}

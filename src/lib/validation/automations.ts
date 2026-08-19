import { z } from "zod";

export const WORKFLOW_TRIGGER_TYPES = [
  "RECORD_CREATED",
  "RECORD_UPDATED",
  "FORM_SUBMITTED",
  "STATUS_CHANGED",
  "TAG_ADDED",
  "USER_ASSIGNED",
] as const;

const stepSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1), kind: z.literal("SEND_EMAIL"), templateId: z.string().min(1) }),
  z.object({ id: z.string().min(1), kind: z.literal("CREATE_TASK"), title: z.string().trim().min(1).max(200), assignedUserId: z.string().optional() }),
  z.object({ id: z.string().min(1), kind: z.literal("ADD_TAG"), tagName: z.string().trim().min(1).max(40) }),
  z.object({ id: z.string().min(1), kind: z.literal("SEND_NOTIFICATION"), title: z.string().trim().min(1).max(200) }),
  z.object({ id: z.string().min(1), kind: z.literal("CONDITION"), field: z.string().min(1), operator: z.enum(["equals", "not_equals"]), value: z.string().trim().max(200) }),
  z.object({ id: z.string().min(1), kind: z.literal("DELAY"), amount: z.number().int().min(1).max(365), unit: z.enum(["minutes", "hours", "days"]) }),
]);

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(2, "Enter a workflow name").max(80),
  triggerType: z.enum(WORKFLOW_TRIGGER_TYPES),
  triggerConfig: z.object({ moduleKey: z.string().optional() }).optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "DRAFT"]).optional(),
  triggerType: z.enum(WORKFLOW_TRIGGER_TYPES).optional(),
  triggerConfig: z.object({ moduleKey: z.string().optional() }).optional(),
  steps: z.array(stepSchema).optional(),
});

// A workflow's `graph` column stores { steps: WorkflowStep[] } — a linear
// sequence rather than a free-form node/edge canvas. This keeps the builder
// UI simple (an ordered list, like Form.fields) while still supporting
// branching-by-stopping (a failed condition ends the run) and time delays.

export type WorkflowStep =
  | { id: string; kind: "SEND_EMAIL"; templateId: string }
  | { id: string; kind: "CREATE_TASK"; title: string; assignedUserId?: string }
  | { id: string; kind: "ADD_TAG"; tagName: string }
  | { id: string; kind: "SEND_NOTIFICATION"; title: string }
  | { id: string; kind: "CONDITION"; field: string; operator: "equals" | "not_equals"; value: string }
  | { id: string; kind: "DELAY"; amount: number; unit: "minutes" | "hours" | "days" };

export interface WorkflowGraph {
  steps: WorkflowStep[];
}

export const STEP_KIND_LABEL: Record<WorkflowStep["kind"], string> = {
  SEND_EMAIL: "Send email",
  CREATE_TASK: "Create task",
  ADD_TAG: "Add tag",
  SEND_NOTIFICATION: "Send notification",
  CONDITION: "Only continue if…",
  DELAY: "Wait",
};

export const CONTACT_CONDITION_FIELDS = ["status", "leadSource", "company"] as const;

import { z } from "zod";

export const pipelineSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  stageNames: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one stage").max(20).optional(),
});

export const stageSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  color: z.string().trim().max(20).optional(),
});

export const pipelineCardSchema = z.object({
  pipelineId: z.string(),
  stageId: z.string(),
  title: z.string().trim().min(1, "Title is required").max(200),
  value: z.union([z.number(), z.null()]).optional(),
  contactId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const moveCardSchema = z.object({
  stageId: z.string().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  sortOrder: z.number().optional(),
});

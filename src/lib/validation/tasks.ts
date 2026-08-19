import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  assignedUserId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "WAITING", "COMPLETED"]).optional(),
  relatedContactId: z.string().optional().nullable(),
});

export const taskCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty").max(4000),
});

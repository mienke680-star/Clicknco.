import { z } from "zod";

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  leadSource: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.string().trim().max(60).optional().or(z.literal("")),
  assignedUserId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

export const contactNoteSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty").max(5000),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(60),
  color: z.string().trim().max(20).optional(),
});

export const customFieldSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only"),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]),
  options: z.array(z.string()).optional(),
});

import { z } from "zod";

export const createTemplateSchema = z.object({
  name: z.string().trim().min(2, "Enter a template name").max(80),
  subject: z.string().trim().min(1, "Enter a subject").max(200),
  body: z.string().trim().min(1, "Enter a body"),
  category: z.string().trim().max(40).optional().or(z.literal("")),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const sendEmailSchema = z
  .object({
    contactId: z.string().trim().min(1, "Choose a contact"),
    templateId: z.string().trim().optional(),
    subject: z.string().trim().min(1, "Enter a subject").max(200),
    body: z.string().trim().min(1, "Enter a body"),
    scheduledAt: z.string().trim().optional(), // ISO datetime; omitted/blank = send now
  })
  .superRefine((data, ctx) => {
    if (data.scheduledAt && Number.isNaN(Date.parse(data.scheduledAt))) {
      ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Invalid date" });
    }
  });

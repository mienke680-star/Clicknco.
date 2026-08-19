import { z } from "zod";

export const createDocumentTemplateSchema = z.object({
  name: z.string().trim().min(2, "Enter a template name").max(80),
  content: z.string().trim().min(1, "Enter the document content"),
});

export const updateDocumentTemplateSchema = createDocumentTemplateSchema.partial();

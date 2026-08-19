import { z } from "zod";

export const MODULE_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "CURRENCY",
  "DATE",
  "TIME",
  "DROPDOWN",
  "MULTISELECT",
  "CHECKBOX",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "FILE",
  "IMAGE",
  "USER",
  "STATUS",
  "RELATIONSHIP",
  "NOTES",
] as const;

const CHOICE_TYPES = new Set(["DROPDOWN", "MULTISELECT", "STATUS"]);

export const createModuleSchema = z.object({
  name: z.string().trim().min(2, "Enter a module name").max(60),
  icon: z.string().trim().min(1).max(40),
  group: z.string().trim().max(40).optional().or(z.literal("")),
});

export const updateModuleSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  icon: z.string().trim().min(1).max(40).optional(),
  group: z.string().trim().max(40).optional().or(z.literal("")),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const createFieldSchema = z
  .object({
    label: z.string().trim().min(1, "Enter a field label").max(60),
    type: z.enum(MODULE_FIELD_TYPES),
    required: z.boolean().optional().default(false),
    showInList: z.boolean().optional().default(true),
    choices: z.array(z.string().trim().min(1)).optional(),
    targetModuleKey: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (CHOICE_TYPES.has(data.type) && (!data.choices || data.choices.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["choices"], message: "Add at least one option" });
    }
    if (data.type === "RELATIONSHIP" && !data.targetModuleKey) {
      ctx.addIssue({ code: "custom", path: ["targetModuleKey"], message: "Choose which module this links to" });
    }
  });

export const updateFieldSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  required: z.boolean().optional(),
  showInList: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  choices: z.array(z.string().trim().min(1)).optional(),
  targetModuleKey: z.string().trim().optional(),
});

/** The record's dynamic field data — required-field presence is checked separately
 * against the module's live ModuleField rows, since the shape can't be statically typed. */
export const moduleRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  relatedContactId: z.string().trim().optional().or(z.literal("")).nullable(),
  assignedUserId: z.string().trim().optional().or(z.literal("")).nullable(),
});

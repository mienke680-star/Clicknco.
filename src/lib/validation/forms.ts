import { z } from "zod";

export const FORM_FIELD_TYPES = ["TEXT", "TEXTAREA", "EMAIL", "PHONE", "NUMBER", "DROPDOWN", "CHECKBOX", "DATE"] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

const CHOICE_TYPES = new Set<FormFieldType>(["DROPDOWN"]);

/** Contact properties a form field can map to when the form's target is Contacts
 * (rather than a custom module, where `mapsTo` holds that module's own field key). */
export const CONTACT_MAP_TARGETS = ["firstName", "lastName", "email", "phone", "company", "leadSource"] as const;

export const formFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    type: z.enum(FORM_FIELD_TYPES),
    label: z.string().trim().min(1, "Enter a field label").max(80),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1)).optional(),
    /** Which record property this field's value fills in on submit — a Contact
     * property (see CONTACT_MAP_TARGETS) or a target module's field key. Unmapped
     * fields are still stored in FormSubmission.data but don't populate a record. */
    mapsTo: z.string().trim().max(60).optional(),
  })
  .superRefine((data, ctx) => {
    if (CHOICE_TYPES.has(data.type) && (!data.options || data.options.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least one option" });
    }
  });

export const successActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message"), message: z.string().trim().min(1).max(300) }),
  z.object({ type: z.literal("redirect"), redirectUrl: z.string().trim().url().max(500) }),
]);

export const createFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a form name").max(80),
  fields: z.array(formFieldSchema).min(1, "Add at least one field"),
  targetModuleKey: z.string().trim().max(60).optional().or(z.literal("")).nullable(),
  successAction: successActionSchema,
});

export const updateFormSchema = createFormSchema.partial();

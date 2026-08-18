import type { ModuleFieldType } from "@/generated/prisma/client";

interface FieldLike {
  key: string;
  label: string;
  required: boolean;
  type: ModuleFieldType;
}

function isEmpty(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Returns the label of the first required field missing from `data`, or null if satisfied. */
export function findMissingRequiredField(fields: FieldLike[], data: Record<string, unknown>): string | null {
  for (const field of fields) {
    if (field.required && isEmpty(data[field.key])) return field.label;
  }
  return null;
}

/** Drops any keys in `data` that aren't a real field on this module, so records can't
 * accumulate arbitrary junk beyond what Build Mode actually defined. */
export function pickKnownFields(fields: FieldLike[], data: Record<string, unknown>): Record<string, unknown> {
  const keys = new Set(fields.map((f) => f.key));
  return Object.fromEntries(Object.entries(data).filter(([k]) => keys.has(k)));
}

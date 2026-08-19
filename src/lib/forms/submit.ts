import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { CONTACT_MAP_TARGETS, type FormFieldType } from "@/lib/validation/forms";

interface FormFieldDef {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
  mapsTo?: string;
}

/** Validates raw submitted values against a form's field definitions, returning
 * the label of the first missing required field, or null if all are present. */
export function findMissingRequiredFormField(fields: FormFieldDef[], data: Record<string, unknown>): string | null {
  for (const field of fields) {
    if (!field.required) continue;
    const value = data[field.id];
    const empty = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
    if (empty) return field.label;
  }
  return null;
}

export function pickKnownFormValues(fields: FormFieldDef[], data: Record<string, unknown>): Record<string, unknown> {
  const ids = new Set(fields.map((f) => f.id));
  return Object.fromEntries(Object.entries(data).filter(([k]) => ids.has(k)));
}

interface RouteResult {
  contactId: string | null;
  moduleRecordId: string | null;
  moduleKey: string | null;
}

/** Routes a validated form submission into a Contact (default target) or a
 * ModuleRecord (custom module target), using each field's `mapsTo`. */
export async function routeFormSubmission(
  companyId: string,
  targetModuleKey: string | null,
  fields: FormFieldDef[],
  data: Record<string, unknown>,
): Promise<RouteResult> {
  const mapped: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.mapsTo && data[field.id] !== undefined && data[field.id] !== "") mapped[field.mapsTo] = data[field.id];
  }

  if (!targetModuleKey || targetModuleKey === "contacts") {
    const email = typeof mapped.email === "string" ? mapped.email.trim().toLowerCase() : undefined;
    const firstName = (typeof mapped.firstName === "string" && mapped.firstName.trim()) || "New Lead";
    const contactData = {
      firstName,
      lastName: typeof mapped.lastName === "string" ? mapped.lastName : null,
      email: email || null,
      phone: typeof mapped.phone === "string" ? mapped.phone : null,
      company: typeof mapped.company === "string" ? mapped.company : null,
      leadSource: typeof mapped.leadSource === "string" ? mapped.leadSource : "Form",
    };

    const contact = email
      ? await prisma.contact.upsert({
          where: { companyId_email: { companyId, email } },
          update: { lastActivityAt: new Date() },
          create: { companyId, ...contactData },
        })
      : await prisma.contact.create({ data: { companyId, ...contactData } });

    return { contactId: contact.id, moduleRecordId: null, moduleKey: null };
  }

  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_key: { companyId, key: targetModuleKey } },
    include: { fields: true },
  });
  if (!companyModule) return { contactId: null, moduleRecordId: null, moduleKey: null };

  const knownKeys = new Set(companyModule.fields.map((f) => f.key));
  const recordData = Object.fromEntries(Object.entries(mapped).filter(([k]) => knownKeys.has(k)));

  const record = await prisma.moduleRecord.create({
    data: { companyId, moduleId: companyModule.id, data: recordData as Prisma.InputJsonValue },
  });

  return { contactId: null, moduleRecordId: record.id, moduleKey: targetModuleKey };
}

export { CONTACT_MAP_TARGETS };

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { publicWriteRateLimit } from "@/lib/api-guard";
import { findMissingRequiredFormField, pickKnownFormValues, routeFormSubmission } from "@/lib/forms/submit";
import { notify } from "@/lib/notify";
import { runAutomationTrigger } from "@/lib/automation/engine";
import type { FormFieldType } from "@/lib/validation/forms";
import type { Prisma } from "@/generated/prisma/client";

const submitSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = publicWriteRateLimit(req, "form-submit");
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const { id } = await params;
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  if (parsed.data.website) {
    // Honeypot tripped — pretend success so bots don't learn anything, but don't store it.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const fields = form.fields as unknown as { id: string; type: FormFieldType; label: string; required: boolean; options?: string[]; mapsTo?: string }[];
  const data = pickKnownFormValues(fields, parsed.data.values);
  const missing = findMissingRequiredFormField(fields, data);
  if (missing) return NextResponse.json({ error: `"${missing}" is required.` }, { status: 400 });

  const { contactId, moduleRecordId, moduleKey } = await routeFormSubmission(form.companyId, form.targetModuleKey, fields, data);

  const submission = await prisma.formSubmission.create({
    data: {
      formId: form.id,
      contactId,
      data: data as Prisma.InputJsonValue,
      sourceUrl: req.headers.get("referer") || null,
    },
  });

  await notify({
    companyId: form.companyId,
    type: "NEW_FORM_SUBMISSION",
    title: `New submission: ${form.name}`,
    link: `/portal/forms/${form.id}`,
  });
  await runAutomationTrigger(form.companyId, "FORM_SUBMITTED", { contactId: contactId ?? undefined, moduleRecordId: moduleRecordId ?? undefined, moduleKey: moduleKey ?? undefined, formId: form.id });

  return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicFormClient } from "./public-form-client";
import type { FormFieldType } from "@/lib/validation/forms";

export const dynamic = "force-dynamic";

interface FormFieldDef {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
}

export default async function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id },
    select: { id: true, name: true, fields: true, successAction: true },
  });
  if (!form) notFound();

  return (
    <div className="min-h-screen bg-cream py-12">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <PublicFormClient
          formId={form.id}
          name={form.name}
          fields={form.fields as unknown as FormFieldDef[]}
          successAction={form.successAction as unknown as { type: "message"; message: string } | { type: "redirect"; redirectUrl: string }}
        />
      </div>
    </div>
  );
}

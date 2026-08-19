"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, Checkbox } from "@/components/ui/input";
import { apiPost, ApiError } from "@/lib/api-client";
import type { FormFieldType } from "@/lib/validation/forms";

interface FormFieldDef {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
}

type SuccessAction = { type: "message"; message: string } | { type: "redirect"; redirectUrl: string };

export function PublicFormClient({
  formId,
  name,
  fields,
  successAction,
}: {
  formId: string;
  name: string;
  fields: FormFieldDef[];
  successAction: SuccessAction;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function setValue(id: string, value: unknown) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/api/public/forms/${formId}/submit`, { values, website });
      if (successAction.type === "redirect") {
        window.location.href = successAction.redirectUrl;
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-navy-100 bg-white p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua-100 text-aqua-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="text-lg font-semibold text-navy-900">Thanks!</p>
        <p className="text-sm text-navy-400">{successAction.type === "message" ? successAction.message : "Your submission was received."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-navy-100 bg-white p-6 sm:p-8">
      <h1 className="text-xl font-bold text-navy-900">{name}</h1>

      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>}

      {fields.map((field) => (
        <div key={field.id}>
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-danger"> *</span>}
          </Label>
          {field.type === "TEXTAREA" ? (
            <Textarea id={field.id} rows={4} required={field.required} value={(values[field.id] as string) ?? ""} onChange={(e) => setValue(field.id, e.target.value)} />
          ) : field.type === "DROPDOWN" ? (
            <Select id={field.id} required={field.required} value={(values[field.id] as string) ?? ""} onChange={(e) => setValue(field.id, e.target.value)}>
              <option value="">Select…</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          ) : field.type === "CHECKBOX" ? (
            <div className="mt-1">
              <Checkbox id={field.id} checked={Boolean(values[field.id])} onChange={(e) => setValue(field.id, e.target.checked)} />
            </div>
          ) : (
            <Input
              id={field.id}
              type={field.type === "EMAIL" ? "email" : field.type === "PHONE" ? "tel" : field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
              required={field.required}
              value={(values[field.id] as string) ?? ""}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
        </div>
      ))}

      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Submit
      </Button>
    </form>
  );
}

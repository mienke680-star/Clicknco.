"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, ChevronUp, ChevronDown, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Checkbox, Textarea, FieldHint } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPatch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { CONTACT_MAP_TARGETS, type FormFieldType } from "@/lib/validation/forms";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "TEXTAREA", label: "Long text" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "NUMBER", label: "Number" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "DATE", label: "Date" },
];
const TYPE_LABEL = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t.label]));
const CONTACT_MAP_LABEL: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  leadSource: "Lead source",
};

interface FormFieldDef {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
  mapsTo?: string;
}
type SuccessAction = { type: "message"; message: string } | { type: "redirect"; redirectUrl: string };
interface FormDetail {
  id: string;
  name: string;
  fields: FormFieldDef[];
  targetModuleKey: string | null;
  successAction: SuccessAction;
}
interface ModuleSummary {
  key: string;
  name: string;
  kind: "BUILTIN" | "CUSTOM";
}
interface Submission {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string | null } | null;
}

export function FormDetailClient({ formId }: { formId: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormDetail | null>(null);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [notFound, setNotFound] = useState(false);

  async function load() {
    try {
      const [detail, moduleList] = await Promise.all([
        apiFetch<{ form: FormDetail }>(`/api/forms/${formId}`),
        apiFetch<{ modules: ModuleSummary[] }>("/api/modules"),
      ]);
      setForm(detail.form);
      setModules(moduleList.modules);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else toast({ title: "Couldn't load form", variant: "error" });
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  if (notFound) {
    return <EmptyState title="Form not found" action={<Link href="/portal/forms" className="text-sm text-coral-600 hover:underline">Back to Forms</Link>} />;
  }
  if (!form) return <PageSpinner />;

  const targetModule = modules.find((m) => m.key === form.targetModuleKey);
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/f/${form.id}` : "";

  return (
    <div>
      <Link href="/portal/forms" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Forms
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">{form.name}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(publicUrl);
            toast({ title: "Link copied", description: publicUrl, variant: "success" });
          }}
        >
          <LinkIcon className="h-3.5 w-3.5" /> Copy public link
        </Button>
      </div>

      <Tabs defaultValue="build">
        <TabsList className="mb-6">
          <TabsTrigger value="build">Build</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="space-y-6">
          <SettingsCard form={form} modules={modules} onSaved={setForm} />
          <FieldsCard form={form} targetModule={targetModule} onSaved={setForm} />
        </TabsContent>

        <TabsContent value="submissions">
          <SubmissionsCard formId={form.id} fields={form.fields} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsCard({ form, modules, onSaved }: { form: FormDetail; modules: ModuleSummary[]; onSaved: (f: FormDetail) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(form.name);
  const [targetModuleKey, setTargetModuleKey] = useState(form.targetModuleKey ?? "contacts");
  const [successType, setSuccessType] = useState(form.successAction.type);
  const [message, setMessage] = useState(form.successAction.type === "message" ? form.successAction.message : "Thanks — we'll be in touch.");
  const [redirectUrl, setRedirectUrl] = useState(form.successAction.type === "redirect" ? form.successAction.redirectUrl : "");
  const [saving, setSaving] = useState(false);

  const customModules = modules.filter((m) => m.kind === "CUSTOM");

  async function save() {
    setSaving(true);
    try {
      const successAction: SuccessAction = successType === "message" ? { type: "message", message } : { type: "redirect", redirectUrl };
      const res = await apiPatch<{ form: FormDetail }>(`/api/forms/${form.id}`, { name, targetModuleKey, successAction });
      onSaved(res.form);
      toast({ title: "Settings saved", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <p className="text-sm font-semibold text-navy-900">Settings</p>
        <div>
          <Label>Form name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Submissions create a new</Label>
          <Select value={targetModuleKey} onChange={(e) => setTargetModuleKey(e.target.value)}>
            <option value="contacts">Contact</option>
            {customModules.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name} record
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>After submitting</Label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="radio" checked={successType === "message"} onChange={() => setSuccessType("message")} /> Show a message
            </label>
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="radio" checked={successType === "redirect"} onChange={() => setSuccessType("redirect")} /> Redirect
            </label>
          </div>
          {successType === "message" ? (
            <Input className="mt-2" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thanks — we'll be in touch." />
          ) : (
            <Input className="mt-2" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://example.com/thank-you" />
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldsCard({ form, targetModule, onSaved }: { form: FormDetail; targetModule: ModuleSummary | undefined; onSaved: (f: FormDetail) => void }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormFieldDef | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [targetFields, setTargetFields] = useState<{ key: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!targetModule || targetModule.kind !== "CUSTOM") {
        setTargetFields([]);
        return;
      }
      apiFetch<{ module: { fields: { key: string; label: string }[] } }>(`/api/modules/${targetModule.key}`)
        .then((res) => setTargetFields(res.module.fields))
        .catch(() => setTargetFields([]));
    }, 0);
    return () => clearTimeout(handle);
  }, [targetModule]);

  async function saveFields(fields: FormFieldDef[]) {
    setBusy(true);
    try {
      const res = await apiPatch<{ form: FormDetail }>(`/api/forms/${form.id}`, { fields });
      onSaved(res.form);
    } catch (err) {
      toast({ title: "Couldn't save fields", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }
  function openEdit(f: FormFieldDef) {
    setEditing(f);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= form.fields.length) return;
    const next = [...form.fields];
    [next[index], next[other]] = [next[other]!, next[index]!];
    await saveFields(next);
  }

  async function removeField(f: FormFieldDef) {
    if (!confirm(`Delete the "${f.label}" field?`)) return;
    await saveFields(form.fields.filter((x) => x.id !== f.id));
    toast({ title: "Field deleted", variant: "success" });
  }

  async function upsertField(field: FormFieldDef) {
    const exists = form.fields.some((f) => f.id === field.id);
    const next = exists ? form.fields.map((f) => (f.id === field.id ? field : f)) : [...form.fields, field];
    await saveFields(next);
    setDialogOpen(false);
    toast({ title: exists ? "Field updated" : "Field added", variant: "success" });
  }

  const mapOptions = targetModule && targetModule.kind === "CUSTOM" ? targetFields.map((f) => ({ value: f.key, label: f.label })) : CONTACT_MAP_TARGETS.map((v) => ({ value: v, label: CONTACT_MAP_LABEL[v] ?? v }));

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-navy-900">Fields</p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Field
          </Button>
        </div>

        {form.fields.length === 0 ? (
          <EmptyState title="No fields yet" description="Add the fields visitors will fill in." action={<Button onClick={openCreate}>Add Field</Button>} />
        ) : (
          <ul className="divide-y divide-navy-50">
            {form.fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || busy} className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer" aria-label={`Move ${f.label} up`}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === form.fields.length - 1 || busy} className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer" aria-label={`Move ${f.label} down`}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">
                    {f.label} {f.required && <span className="text-danger">*</span>}
                  </p>
                  <p className="truncate text-xs text-navy-400">
                    {TYPE_LABEL[f.type] ?? f.type}
                    {f.mapsTo ? ` · maps to ${CONTACT_MAP_LABEL[f.mapsTo] ?? f.mapsTo}` : " · not mapped"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Edit ${f.label}`} onClick={() => openEdit(f)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${f.label}`} disabled={busy} onClick={() => removeField(f)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <FieldDialog key={formKey} open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} mapOptions={mapOptions} onSave={upsertField} />
    </Card>
  );
}

function FieldDialog({
  open,
  onClose,
  editing,
  mapOptions,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: FormFieldDef | null;
  mapOptions: { value: string; label: string }[];
  onSave: (f: FormFieldDef) => Promise<void>;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState(editing?.label ?? "");
  const [type, setType] = useState<FormFieldType>(editing?.type ?? "TEXT");
  const [required, setRequired] = useState(editing?.required ?? false);
  const [optionsText, setOptionsText] = useState((editing?.options ?? []).join("\n"));
  const [mapsTo, setMapsTo] = useState(editing?.mapsTo ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (label.trim().length < 1) {
      toast({ title: "Enter a field label", variant: "error" });
      return;
    }
    const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
    if (type === "DROPDOWN" && options.length === 0) {
      toast({ title: "Add at least one option", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
      const id = editing?.id ?? (slug || `field_${Date.now()}`);
      await onSave({ id, type, label, required, options: type === "DROPDOWN" ? options : undefined, mapsTo: mapsTo || undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit Field" : "Add Field"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            {editing ? "Save changes" : "Add Field"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Email Address" autoFocus />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as FormFieldType)}>
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        {type === "DROPDOWN" && (
          <div>
            <Label>Options (one per line)</Label>
            <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4} placeholder={"Buying\nSelling\nJust looking"} />
          </div>
        )}
        <div>
          <Label>Maps to</Label>
          <Select value={mapsTo} onChange={(e) => setMapsTo(e.target.value)}>
            <option value="">Not mapped (stored with the submission only)</option>
            {mapOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <FieldHint>Which record property this field&apos;s value fills in when a submission creates a record.</FieldHint>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} id="field-required" />
          <Label htmlFor="field-required" className="mb-0 cursor-pointer">
            Required
          </Label>
        </div>
      </div>
    </Dialog>
  );
}

function SubmissionsCard({ formId, fields }: { formId: string; fields: FormFieldDef[] }) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      apiFetch<{ submissions: Submission[] }>(`/api/forms/${formId}/submissions`)
        .then((res) => setSubmissions(res.submissions))
        .catch(() => toast({ title: "Couldn't load submissions", variant: "error" }));
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  if (submissions === null) return <PageSpinner />;
  if (submissions.length === 0) {
    return (
      <Card>
        <EmptyState title="No submissions yet" description="Submissions will appear here as visitors fill out this form." />
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <Table>
        <THead>
          <TR>
            <TH>Submitted</TH>
            {fields.slice(0, 3).map((f) => (
              <TH key={f.id}>{f.label}</TH>
            ))}
            <TH>Contact</TH>
          </TR>
        </THead>
        <TBody>
          {submissions.map((s) => (
            <TR key={s.id}>
              <TD>{formatDateTime(s.createdAt)}</TD>
              {fields.slice(0, 3).map((f) => (
                <TD key={f.id}>{String(s.data[f.id] ?? "—")}</TD>
              ))}
              <TD>
                {s.contact ? (
                  <Link href={`/portal/contacts/${s.contact.id}`} className="text-coral-600 hover:underline">
                    {s.contact.firstName} {s.contact.lastName ?? ""}
                  </Link>
                ) : (
                  "—"
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

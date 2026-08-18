"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Switch, Checkbox, Textarea, FieldHint } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPatch, apiPost, apiDelete, ApiError } from "@/lib/api-client";

const FIELD_TYPES: { value: string; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "CURRENCY", label: "Currency" },
  { value: "DATE", label: "Date" },
  { value: "TIME", label: "Time" },
  { value: "DROPDOWN", label: "Dropdown (single choice)" },
  { value: "MULTISELECT", label: "Multi-select" },
  { value: "CHECKBOX", label: "Checkbox (yes/no)" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "ADDRESS", label: "Address" },
  { value: "FILE", label: "File upload" },
  { value: "IMAGE", label: "Image upload" },
  { value: "USER", label: "Team member" },
  { value: "STATUS", label: "Status (colored choice)" },
  { value: "RELATIONSHIP", label: "Link to another module" },
  { value: "NOTES", label: "Long text / notes" },
];
const CHOICE_TYPES = new Set(["DROPDOWN", "MULTISELECT", "STATUS"]);
const TYPE_LABEL = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t.label]));

interface FieldRow {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  showInList: boolean;
  sortOrder: number;
  options: { choices?: string[]; targetModuleKey?: string } | null;
}

interface ModuleDetail {
  id: string;
  key: string;
  name: string;
  icon: string;
  kind: "BUILTIN" | "CUSTOM";
  group: string | null;
  active: boolean;
  fields: FieldRow[];
}

interface ModuleSummary {
  key: string;
  name: string;
  kind: "BUILTIN" | "CUSTOM";
}

export function ModuleBuilderClient({ moduleKey }: { moduleKey: string }) {
  const { toast } = useToast();
  const [companyModule, setCompanyModule] = useState<ModuleDetail | null>(null);
  const [allModules, setAllModules] = useState<ModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [detail, list] = await Promise.all([
        apiFetch<{ module: ModuleDetail }>(`/api/modules/${moduleKey}`),
        apiFetch<{ modules: ModuleSummary[] }>("/api/modules"),
      ]);
      setCompanyModule(detail.module);
      setAllModules(list.modules);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else toast({ title: "Couldn't load module", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey]);

  if (loading) return <PageSpinner />;
  if (notFound || !companyModule) {
    return <EmptyState title="Module not found" action={<Link href="/portal/build/modules" className="text-sm text-coral-600 hover:underline">Back to Modules</Link>} />;
  }

  return (
    <div>
      <Link href="/portal/build/modules" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Modules & Navigation
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">{companyModule.name}</h1>
        <Badge variant={companyModule.kind === "BUILTIN" ? "neutral" : "coral"}>{companyModule.kind === "BUILTIN" ? "Built-in" : "Custom"}</Badge>
      </div>

      <div className="space-y-6">
        <SettingsSection module={companyModule} onSaved={setCompanyModule} />
        {companyModule.kind === "CUSTOM" && (
          <FieldsSection module={companyModule} allModules={allModules} onChanged={setCompanyModule} />
        )}
      </div>
    </div>
  );
}

function SettingsSection({ module: m, onSaved }: { module: ModuleDetail; onSaved: (m: ModuleDetail) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(m.name);
  const [icon, setIcon] = useState(m.icon);
  const [group, setGroup] = useState(m.group ?? "");
  const [active, setActive] = useState(m.active);

  async function save() {
    setSaving(true);
    try {
      const res = await apiPatch<{ module: ModuleDetail }>(`/api/modules/${m.key}`, { name, icon, group, active });
      onSaved({ ...res.module, fields: m.fields });
      toast({ title: "Module saved", variant: "success" });
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Sidebar group</Label>
            <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div>
          <Label>Icon</Label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={active} onCheckedChange={setActive} />
          <div>
            <p className="text-sm font-medium text-navy-800">Visible in sidebar</p>
            <FieldHint>Turn this off to hide the module without deleting its data.</FieldHint>
          </div>
        </div>
        {m.kind === "BUILTIN" && <FieldHint>This is a built-in module — its key and fields are fixed, but you can rename, re-icon, regroup, or hide it.</FieldHint>}
        <div className="flex items-center justify-between">
          {m.kind === "CUSTOM" ? <DeleteModuleButton module={m} /> : <span />}
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteModuleButton({ module: m }: { module: ModuleDetail }) {
  const { toast } = useToast();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete the "${m.name}" module? This permanently deletes all of its fields and records — this can't be undone.`)) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/modules/${m.key}`);
      toast({ title: `${m.name} deleted`, variant: "success" });
      router.push("/portal/build/modules");
    } catch (err) {
      toast({ title: "Couldn't delete module", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
      setDeleting(false);
    }
  }

  return (
    <Button variant="danger" onClick={handleDelete} loading={deleting}>
      <Trash2 className="h-4 w-4" /> Delete Module
    </Button>
  );
}

function FieldsSection({
  module: m,
  allModules,
  onChanged,
}: {
  module: ModuleDetail;
  allModules: ModuleSummary[];
  onChanged: (m: ModuleDetail) => void;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FieldRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fields = [...m.fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const relationshipTargets = allModules.filter((x) => x.kind === "CUSTOM" && x.key !== m.key);

  async function refreshFields() {
    const res = await apiFetch<{ module: ModuleDetail }>(`/api/modules/${m.key}`);
    onChanged(res.module);
  }

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(f: FieldRow) {
    setEditing(f);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= fields.length) return;
    const a = fields[index]!;
    const b = fields[other]!;
    setBusyId(a.id);
    try {
      await Promise.all([
        apiPatch(`/api/modules/${m.key}/fields/${a.id}`, { sortOrder: b.sortOrder }),
        apiPatch(`/api/modules/${m.key}/fields/${b.id}`, { sortOrder: a.sortOrder }),
      ]);
      await refreshFields();
    } catch (err) {
      toast({ title: "Couldn't reorder fields", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function removeField(f: FieldRow) {
    if (!confirm(`Delete the "${f.label}" field? Existing records keep their data, but it will no longer show anywhere.`)) return;
    setBusyId(f.id);
    try {
      await apiDelete(`/api/modules/${m.key}/fields/${f.id}`);
      toast({ title: "Field deleted", variant: "success" });
      await refreshFields();
    } catch (err) {
      toast({ title: "Couldn't delete field", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-navy-900">Fields</p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Field
          </Button>
        </div>

        {fields.length === 0 ? (
          <EmptyState title="No fields yet" description="Add the fields you want to capture for this module." action={<Button onClick={openCreate}>Add Field</Button>} />
        ) : (
          <ul className="divide-y divide-navy-50">
            {fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || busyId === f.id} className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer" aria-label={`Move ${f.label} up`}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === fields.length - 1 || busyId === f.id} className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer" aria-label={`Move ${f.label} down`}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">
                    {f.label} {f.required && <span className="text-danger">*</span>}
                  </p>
                  <p className="truncate text-xs text-navy-400">
                    {f.key} · {TYPE_LABEL[f.type] ?? f.type}
                    {!f.showInList ? " · hidden from list" : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Edit ${f.label}`} onClick={() => openEdit(f)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${f.label}`} disabled={busyId === f.id} onClick={() => removeField(f)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <FieldDialog
        key={formKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        moduleKey={m.key}
        relationshipTargets={relationshipTargets}
        onSaved={async () => {
          setDialogOpen(false);
          await refreshFields();
        }}
      />
    </Card>
  );
}

function FieldDialog({
  open,
  onClose,
  editing,
  moduleKey,
  relationshipTargets,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: FieldRow | null;
  moduleKey: string;
  relationshipTargets: ModuleSummary[];
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState(editing?.label ?? "");
  const [type, setType] = useState(editing?.type ?? "TEXT");
  const [required, setRequired] = useState(editing?.required ?? false);
  const [showInList, setShowInList] = useState(editing?.showInList ?? true);
  const [choicesText, setChoicesText] = useState((editing?.options?.choices ?? []).join("\n"));
  const [targetModuleKey, setTargetModuleKey] = useState(editing?.options?.targetModuleKey ?? relationshipTargets[0]?.key ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (label.trim().length < 1) {
      toast({ title: "Enter a field label", variant: "error" });
      return;
    }
    const choices = choicesText.split("\n").map((c) => c.trim()).filter(Boolean);
    if (CHOICE_TYPES.has(type) && choices.length === 0) {
      toast({ title: "Add at least one option", variant: "error" });
      return;
    }
    if (type === "RELATIONSHIP" && !targetModuleKey) {
      toast({ title: "Choose which module this links to", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await apiPatch(`/api/modules/${moduleKey}/fields/${editing.id}`, { label, required, showInList, choices, targetModuleKey });
      } else {
        await apiPost(`/api/modules/${moduleKey}/fields`, { label, type, required, showInList, choices, targetModuleKey });
      }
      toast({ title: editing ? "Field updated" : "Field added", variant: "success" });
      await onSaved();
    } catch (err) {
      toast({ title: "Couldn't save field", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
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
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Listing Price" autoFocus />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)} disabled={Boolean(editing)}>
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          {editing && <FieldHint>Field type can&apos;t be changed after creation — delete and re-add if you need a different type.</FieldHint>}
        </div>

        {CHOICE_TYPES.has(type) && (
          <div>
            <Label>Options (one per line)</Label>
            <Textarea value={choicesText} onChange={(e) => setChoicesText(e.target.value)} rows={4} placeholder={"Active\nUnder Offer\nSold"} />
          </div>
        )}

        {type === "RELATIONSHIP" && (
          <div>
            <Label>Links to</Label>
            {relationshipTargets.length === 0 ? (
              <FieldHint>Create another custom module first — relationship fields link two custom modules together.</FieldHint>
            ) : (
              <Select value={targetModuleKey} onChange={(e) => setTargetModuleKey(e.target.value)}>
                {relationshipTargets.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {(type === "FILE" || type === "IMAGE") && <FieldHint>Uploads happen right on the record form — nothing else to configure here.</FieldHint>}

        <div className="flex items-center gap-3">
          <Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} id="field-required" />
          <Label htmlFor="field-required" className="mb-0 cursor-pointer">
            Required
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox checked={showInList} onChange={(e) => setShowInList(e.target.checked)} id="field-show-list" />
          <Label htmlFor="field-show-list" className="mb-0 cursor-pointer">
            Show as a column in the record list
          </Label>
        </div>
      </div>
    </Dialog>
  );
}

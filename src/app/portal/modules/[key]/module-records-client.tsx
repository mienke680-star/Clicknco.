"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate, singularize } from "@/lib/utils";
import { DynamicFieldInput, type FieldDef, type FileValue } from "./field-input";

interface UserOption {
  id: string;
  name: string;
}
interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}
interface RecordRow {
  id: string;
  data: Record<string, unknown>;
  relatedContactId: string | null;
  assignedUserId: string | null;
  createdAt: string;
  relatedContact: ContactOption | null;
  assignedUser: UserOption | null;
  createdBy: UserOption | null;
}

function contactName(c: ContactOption) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ");
}

function recordLabel(record: RecordRow, fields: FieldDef[]) {
  const primary = fields.find((f) => f.showInList) ?? fields[0];
  const value = primary ? record.data[primary.key] : undefined;
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return `Record ${record.id.slice(-6)}`;
}

function displayValue(field: FieldDef, value: unknown, users: UserOption[]): React.ReactNode {
  if (value === undefined || value === null || value === "") return <span className="text-navy-300">—</span>;
  switch (field.type) {
    case "CURRENCY":
      return formatCurrency(value as number);
    case "NUMBER":
      return String(value);
    case "DATE":
      return formatDate(value as string);
    case "CHECKBOX":
      return value ? "Yes" : "No";
    case "MULTISELECT":
      return Array.isArray(value) ? (value as string[]).join(", ") : String(value);
    case "USER":
      return users.find((u) => u.id === value)?.name ?? "—";
    case "FILE":
    case "IMAGE":
      return (value as FileValue)?.fileName ?? "—";
    default:
      return String(value);
  }
}

export function ModuleRecordsClient({
  moduleKey,
  moduleName,
  fields,
  users,
  contacts,
  canCreate,
  canEdit,
  canDelete,
}: {
  moduleKey: string;
  moduleName: string;
  fields: FieldDef[];
  users: UserOption[];
  contacts: ContactOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { toast } = useToast();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [relationshipData, setRelationshipData] = useState<Record<string, { fields: FieldDef[]; records: RecordRow[] }>>({});

  const listFields = useMemo(() => fields.filter((f) => f.showInList), [fields]);
  const relationshipFields = useMemo(() => fields.filter((f) => f.type === "RELATIONSHIP" && f.options?.targetModuleKey), [fields]);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ records: RecordRow[] }>(`/api/modules/${moduleKey}/records`);
      setRecords(res.records);
    } catch {
      toast({ title: "Couldn't load records", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey]);

  useEffect(() => {
    if (relationshipFields.length === 0) return;
    const handle = setTimeout(async () => {
      const entries = await Promise.all(
        relationshipFields.map(async (f) => {
          const targetKey = f.options!.targetModuleKey!;
          try {
            const [detail, list] = await Promise.all([
              apiFetch<{ module: { fields: FieldDef[] } }>(`/api/modules/${targetKey}`),
              apiFetch<{ records: RecordRow[] }>(`/api/modules/${targetKey}/records`),
            ]);
            return [targetKey, { fields: detail.module.fields, records: list.records }] as const;
          } catch {
            return [targetKey, { fields: [], records: [] }] as const;
          }
        }),
      );
      setRelationshipData(Object.fromEntries(entries));
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, relationshipFields.map((f) => f.key).join(",")]);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }
  function openEdit(r: RecordRow) {
    setEditing(r);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleDelete(r: RecordRow) {
    if (!confirm(`Delete this ${singularize(moduleName)}? This can't be undone.`)) return;
    try {
      await apiDelete(`/api/modules/${moduleKey}/records/${r.id}`);
      setRecords((prev) => prev.filter((x) => x.id !== r.id));
      toast({ title: "Deleted", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't delete", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  function relationshipOptionsFor(field: FieldDef) {
    const targetKey = field.options?.targetModuleKey;
    if (!targetKey) return [];
    const target = relationshipData[targetKey];
    if (!target) return [];
    return target.records.map((r) => ({ id: r.id, label: recordLabel(r, target.fields) }));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">{moduleName}</h1>
          <p className="mt-1 text-sm text-navy-400">
            {records.length} record{records.length === 1 ? "" : "s"}
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add {singularize(moduleName)}
          </Button>
        )}
      </div>

      {loading ? (
        <PageSpinner />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Blocks className="h-10 w-10" />}
          title={`No ${moduleName.toLowerCase()} yet`}
          action={canCreate ? <Button onClick={openCreate}>Add {singularize(moduleName)}</Button> : undefined}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              {listFields.map((f) => (
                <TH key={f.id}>{f.label}</TH>
              ))}
              <TH>Assigned</TH>
              <TH>Created</TH>
            </TR>
          </THead>
          <TBody>
            {records.map((r) => (
              <TR key={r.id} className="cursor-pointer" onClick={() => (canEdit ? openEdit(r) : undefined)}>
                {listFields.map((f) => (
                  <TD key={f.id}>{displayValue(f, r.data[f.key], users)}</TD>
                ))}
                <TD>{r.assignedUser?.name ?? <span className="text-navy-300">—</span>}</TD>
                <TD>{formatDate(r.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <RecordDialog
        key={formKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        moduleKey={moduleKey}
        moduleName={moduleName}
        fields={fields}
        users={users}
        contacts={contacts}
        editing={editing}
        canEdit={canEdit}
        canDelete={canDelete}
        relationshipOptionsFor={relationshipOptionsFor}
        onSaved={(record) => {
          setRecords((prev) => {
            const exists = prev.some((r) => r.id === record.id);
            return exists ? prev.map((r) => (r.id === record.id ? record : r)) : [record, ...prev];
          });
          setDialogOpen(false);
        }}
        onDeleted={() => {
          if (editing) handleDelete(editing);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function RecordDialog({
  open,
  onClose,
  moduleKey,
  moduleName,
  fields,
  users,
  contacts,
  editing,
  canEdit,
  canDelete,
  relationshipOptionsFor,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  moduleKey: string;
  moduleName: string;
  fields: FieldDef[];
  users: UserOption[];
  contacts: ContactOption[];
  editing: RecordRow | null;
  canEdit: boolean;
  canDelete: boolean;
  relationshipOptionsFor: (field: FieldDef) => { id: string; label: string }[];
  onSaved: (record: RecordRow) => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, unknown>>(() => editing?.data ?? {});
  const [relatedContactId, setRelatedContactId] = useState(editing?.relatedContactId ?? "");
  const [assignedUserId, setAssignedUserId] = useState(editing?.assignedUserId ?? "");
  const [saving, setSaving] = useState(false);
  const readOnly = Boolean(editing) && !canEdit;

  function setFieldValue(key: string, value: unknown) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    try {
      const payload = { data, relatedContactId: relatedContactId || null, assignedUserId: assignedUserId || null };
      const res = editing
        ? await apiPatch<{ record: RecordRow }>(`/api/modules/${moduleKey}/records/${editing.id}`, payload)
        : await apiPost<{ record: RecordRow }>(`/api/modules/${moduleKey}/records`, payload);
      toast({ title: editing ? "Saved" : `${singularize(moduleName)} added`, variant: "success" });
      onSaved(res.record);
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${singularize(moduleName)}` : `Add ${singularize(moduleName)}`}
      footer={
        readOnly ? (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            {editing && canDelete && (
              <Button variant="danger" className="mr-auto" onClick={onDeleted}>
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={saving} onClick={submit}>
              {editing ? "Save changes" : "Add"}
            </Button>
          </>
        )
      }
    >
      <fieldset disabled={readOnly} className="space-y-4">
        {fields.map((f) => (
          <div key={f.id}>
            <Label>
              {f.label} {f.required && <span className="text-danger">*</span>}
            </Label>
            <DynamicFieldInput
              field={f}
              value={data[f.key]}
              onChange={(v) => setFieldValue(f.key, v)}
              users={users}
              relationshipOptions={f.type === "RELATIONSHIP" ? relationshipOptionsFor(f) : []}
            />
          </div>
        ))}

        <div>
          <Label>Related contact</Label>
          <Select value={relatedContactId} onChange={(e) => setRelatedContactId(e.target.value)}>
            <option value="">None</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {contactName(c)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Assigned to</Label>
          <Select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>
    </Dialog>
  );
}

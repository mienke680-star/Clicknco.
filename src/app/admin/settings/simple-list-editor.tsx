"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";

interface BaseItem {
  id: string;
  active: boolean;
  sortOrder: number;
}

export function SimpleListEditor<T extends BaseItem>({
  title,
  itemLabel,
  apiPath,
  items,
  onChange,
  renderRow,
  renderForm,
  emptyItem,
  isValid,
}: {
  title: string;
  itemLabel: string;
  apiPath: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderRow: (item: T) => React.ReactNode;
  renderForm: (value: Partial<T>, set: (patch: Partial<T>) => void) => React.ReactNode;
  emptyItem: Partial<T>;
  isValid: (value: Partial<T>) => boolean;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [draft, setDraft] = useState<Partial<T>>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDraft(emptyItem);
    setDialogOpen(true);
  }
  function openEdit(item: T) {
    setEditing(item);
    setDraft(item);
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        const res = await apiPatch<Record<string, T>>(`${apiPath}/${editing.id}`, draft);
        const saved = Object.values(res)[0]!;
        onChange(items.map((i) => (i.id === editing.id ? saved : i)));
        toast({ title: `${itemLabel} saved`, variant: "success" });
      } else {
        const res = await apiPost<Record<string, T>>(apiPath, draft);
        const created = Object.values(res)[0]!;
        onChange([...items, created].sort((a, b) => a.sortOrder - b.sortOrder));
        toast({ title: `${itemLabel} added`, variant: "success" });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: T) {
    setBusyId(item.id);
    try {
      await apiPatch(`${apiPath}/${item.id}`, { active: !item.active });
      onChange(items.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i)));
    } catch (err) {
      toast({ title: "Couldn't update", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: T) {
    if (!confirm(`Delete this ${itemLabel.toLowerCase()}? This can't be undone.`)) return;
    setBusyId(item.id);
    try {
      await apiDelete(`${apiPath}/${item.id}`);
      onChange(items.filter((i) => i.id !== item.id));
      toast({ title: `${itemLabel} deleted`, variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't delete", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  function set(patch: Partial<T>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-navy-900">{title}</p>
          <p className="text-xs text-navy-400">Shown live on the public site — inactive items are hidden, not deleted.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add {itemLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`} action={<Button onClick={openCreate}>Add {itemLabel}</Button>} />
      ) : (
        <ul className="divide-y divide-navy-50 rounded-2xl border border-navy-100 bg-white">
          {[...items]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">{renderRow(item)}</div>
                <Switch checked={item.active} onCheckedChange={() => toggleActive(item)} disabled={busyId === item.id} />
                <Button variant="ghost" size="icon" aria-label={`Edit`} onClick={() => openEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Delete`} disabled={busyId === item.id} onClick={() => remove(item)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Edit ${itemLabel}` : `Add ${itemLabel}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} disabled={!isValid(draft)} onClick={save}>
              {editing ? "Save changes" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">{renderForm(draft, set)}</div>
      </Dialog>
    </div>
  );
}

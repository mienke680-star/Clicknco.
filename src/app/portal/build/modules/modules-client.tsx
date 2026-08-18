"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronUp, ChevronDown, ChevronRight, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Switch, FieldHint } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPatch, apiPost, ApiError } from "@/lib/api-client";

interface ModuleRow {
  id: string;
  key: string;
  name: string;
  icon: string;
  kind: "BUILTIN" | "CUSTOM";
  group: string | null;
  active: boolean;
  sortOrder: number;
  _count: { fields: number; records: number };
}

export function ModulesClient({ companyName }: { companyName: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Layers");
  const [group, setGroup] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ modules: ModuleRow[] }>("/api/modules");
      setModules(res.modules);
    } catch {
      toast({ title: "Couldn't load modules", variant: "error" });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleActive(m: ModuleRow) {
    setBusyId(m.id);
    try {
      await apiPatch(`/api/modules/${m.key}`, { active: !m.active });
      setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)));
    } catch (err) {
      toast({ title: "Couldn't update module", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= modules.length) return;
    const a = modules[index]!;
    const b = modules[other]!;
    setBusyId(a.id);
    try {
      await Promise.all([
        apiPatch(`/api/modules/${a.key}`, { sortOrder: b.sortOrder }),
        apiPatch(`/api/modules/${b.key}`, { sortOrder: a.sortOrder }),
      ]);
      setModules((prev) => {
        const next = [...prev];
        next[index] = { ...b, sortOrder: a.sortOrder };
        next[other] = { ...a, sortOrder: b.sortOrder };
        return next.sort((x, y) => x.sortOrder - y.sortOrder);
      });
    } catch (err) {
      toast({ title: "Couldn't reorder modules", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function submitCreate() {
    if (name.trim().length < 2) {
      toast({ title: "Enter a module name", variant: "error" });
      return;
    }
    setCreating(true);
    try {
      const { module: created } = await apiPost<{ module: ModuleRow }>("/api/modules", { name: name.trim(), icon, group });
      toast({ title: `${created.name} module created`, description: "Add custom fields to it next.", variant: "success" });
      setCreateOpen(false);
      router.push(`/portal/build/modules/${created.key}`);
    } catch (err) {
      toast({ title: "Couldn't create module", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setName("");
    setIcon("Layers");
    setGroup("");
    setCreateOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">Modules & Navigation</h1>
          <p className="mt-1 text-sm text-navy-400">
            This list controls {companyName}&apos;s sidebar directly — reorder here, see it change in your own nav.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Custom Module
        </Button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : modules.length === 0 ? (
        <EmptyState icon={<Blocks className="h-10 w-10" />} title="No modules yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
          <ul className="divide-y divide-navy-50">
            {modules.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busyId === m.id}
                    className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                    aria-label={`Move ${m.name} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === modules.length - 1 || busyId === m.id}
                    className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                    aria-label={`Move ${m.name} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-600">
                  <DynamicIcon name={m.icon} className="h-4 w-4" />
                </div>

                <button
                  onClick={() => router.push(`/portal/build/modules/${m.key}`)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{m.name}</p>
                    <p className="truncate text-xs text-navy-400">
                      {m.key}
                      {m.group ? ` · ${m.group}` : ""}
                      {m.kind === "CUSTOM" ? ` · ${m._count.fields} field${m._count.fields === 1 ? "" : "s"}, ${m._count.records} record${m._count.records === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                </button>

                <Badge variant={m.kind === "BUILTIN" ? "neutral" : "coral"}>{m.kind === "BUILTIN" ? "Built-in" : "Custom"}</Badge>
                <Switch checked={m.active} onCheckedChange={() => toggleActive(m)} disabled={busyId === m.id} />
                <button onClick={() => router.push(`/portal/build/modules/${m.key}`)} className="text-navy-300 hover:text-navy-600 cursor-pointer" aria-label={`Edit ${m.name}`}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Custom Module"
        description="Give it a name and icon — you'll add fields next."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating} onClick={submitCreate}>
              Create Module
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Module name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Properties" autoFocus />
          </div>
          <div>
            <Label>Sidebar group (optional)</Label>
            <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. Listings" />
            <FieldHint>Modules that share a group are shown together in the sidebar.</FieldHint>
          </div>
          <div>
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

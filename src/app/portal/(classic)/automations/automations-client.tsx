"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Workflow as WorkflowIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/table";
import { PageSpinner, SectionHeading } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiDelete, ApiError } from "@/lib/api-client";
import { WORKFLOW_TRIGGER_TYPES } from "@/lib/validation/automations";

const TRIGGER_LABEL: Record<string, string> = {
  RECORD_CREATED: "A record is created",
  RECORD_UPDATED: "A record is updated",
  FORM_SUBMITTED: "A form is submitted",
  STATUS_CHANGED: "A pipeline stage changes",
  TAG_ADDED: "A tag is added",
  USER_ASSIGNED: "A user is assigned",
};

const STATUS_VARIANT: Record<string, "success" | "neutral" | "warning"> = { ACTIVE: "success", PAUSED: "warning", DRAFT: "neutral" };

interface WorkflowRow {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  triggerType: string;
  createdAt: string;
  _count: { runs: number };
}

export function AutomationsClient({ canCreate, canDelete }: { canCreate: boolean; canDelete: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowRow[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{ workflows: WorkflowRow[] }>("/api/automations");
      setWorkflows(res.workflows);
    } catch {
      toast({ title: "Couldn't load automations", variant: "error" });
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeWorkflow(w: WorkflowRow) {
    if (!confirm(`Delete "${w.name}"? Its run history will be deleted too — this can't be undone.`)) return;
    try {
      await apiDelete(`/api/automations/${w.id}`);
      toast({ title: "Automation deleted", variant: "success" });
      setWorkflows((prev) => prev?.filter((x) => x.id !== w.id) ?? null);
    } catch (err) {
      toast({ title: "Couldn't delete automation", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  return (
    <div>
      <SectionHeading
        title="Automations"
        description="Trigger emails, tasks and notifications automatically."
        action={
          canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New Automation
            </Button>
          )
        }
      />

      {workflows === null ? (
        <PageSpinner />
      ) : workflows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<WorkflowIcon className="h-10 w-10" />}
            title="No automations yet"
            description="Build a workflow that fires automatically when something happens — a form is submitted, a record is created, or a pipeline stage changes."
            action={canCreate && <Button onClick={() => setDialogOpen(true)}>Create your first automation</Button>}
          />
        </Card>
      ) : (
        <Card className="divide-y divide-navy-50">
          {workflows.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-peach text-coral-600">
                <WorkflowIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/portal/automations/${w.id}`} className="truncate text-sm font-semibold text-navy-900 hover:underline">
                  {w.name}
                </Link>
                <p className="truncate text-xs text-navy-400">
                  When {TRIGGER_LABEL[w.triggerType] ?? w.triggerType} · {w._count.runs} run{w._count.runs === 1 ? "" : "s"}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[w.status]} dot>
                {w.status === "ACTIVE" ? "Active" : w.status === "PAUSED" ? "Paused" : "Draft"}
              </Badge>
              {canDelete && (
                <Button variant="ghost" size="icon" aria-label={`Delete ${w.name}`} onClick={() => removeWorkflow(w)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <CreateWorkflowDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={(id) => router.push(`/portal/automations/${id}`)} />
    </div>
  );
}

function CreateWorkflowDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState(WORKFLOW_TRIGGER_TYPES[0]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim().length < 2) {
      toast({ title: "Enter an automation name", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiPost<{ workflow: { id: string } }>("/api/automations", { name, triggerType });
      toast({ title: "Automation created", variant: "success" });
      setName("");
      onCreated(res.workflow.id);
    } catch (err) {
      toast({ title: "Couldn't create automation", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Automation"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Create Automation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome new leads" autoFocus />
        </div>
        <div>
          <Label>Trigger — run this when…</Label>
          <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value as typeof triggerType)}>
            {WORKFLOW_TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Dialog>
  );
}

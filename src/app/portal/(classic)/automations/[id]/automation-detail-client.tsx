"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, ChevronUp, ChevronDown, Pencil, Trash2, Mail, ListChecks, Tag as TagIcon, Bell, GitBranch, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldHint } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPatch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { WORKFLOW_TRIGGER_TYPES } from "@/lib/validation/automations";
import { STEP_KIND_LABEL, CONTACT_CONDITION_FIELDS, type WorkflowStep } from "@/lib/automation/graph-types";

const TRIGGER_LABEL: Record<string, string> = {
  RECORD_CREATED: "A record is created",
  RECORD_UPDATED: "A record is updated",
  FORM_SUBMITTED: "A form is submitted",
  STATUS_CHANGED: "A pipeline stage changes",
  TAG_ADDED: "A tag is added",
  USER_ASSIGNED: "A user is assigned",
};
const STEP_ICON: Record<WorkflowStep["kind"], React.ComponentType<{ className?: string }>> = {
  SEND_EMAIL: Mail,
  CREATE_TASK: ListChecks,
  ADD_TAG: TagIcon,
  SEND_NOTIFICATION: Bell,
  CONDITION: GitBranch,
  DELAY: Clock,
};
const RUN_STATUS_VARIANT: Record<string, "warning" | "success" | "danger" | "neutral"> = { RUNNING: "warning", COMPLETED: "success", FAILED: "danger", CANCELLED: "neutral" };

interface Template {
  id: string;
  name: string;
}
interface UserOption {
  id: string;
  name: string;
}
interface RunRow {
  id: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  startedAt: string;
  completedAt: string | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
}
interface WorkflowDetail {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  triggerType: string;
  graph: { steps: WorkflowStep[] };
  runs: RunRow[];
}

function stepSummary(step: WorkflowStep, templates: Template[], users: UserOption[]): string {
  switch (step.kind) {
    case "SEND_EMAIL":
      return templates.find((t) => t.id === step.templateId)?.name ?? "(template deleted)";
    case "CREATE_TASK":
      return `"${step.title}"${step.assignedUserId ? ` → ${users.find((u) => u.id === step.assignedUserId)?.name ?? "someone"}` : ""}`;
    case "ADD_TAG":
      return `"${step.tagName}"`;
    case "SEND_NOTIFICATION":
      return `"${step.title}"`;
    case "CONDITION":
      return `${step.field} ${step.operator === "equals" ? "=" : "≠"} "${step.value}"`;
    case "DELAY":
      return `${step.amount} ${step.unit}`;
  }
}

export function AutomationDetailClient({ workflowId, templates, users, canEdit }: { workflowId: string; templates: Template[]; users: UserOption[]; canEdit: boolean }) {
  const { toast } = useToast();
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowStep | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{ workflow: WorkflowDetail }>(`/api/automations/${workflowId}`);
      setWorkflow(res.workflow);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else toast({ title: "Couldn't load automation", variant: "error" });
    }
  }

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  if (notFound) {
    return <EmptyState title="Automation not found" action={<Link href="/portal/automations" className="text-sm text-coral-600 hover:underline">Back to Automations</Link>} />;
  }
  if (!workflow) return <PageSpinner />;

  async function saveSteps(steps: WorkflowStep[]) {
    setBusy(true);
    try {
      const res = await apiPatch<{ workflow: WorkflowDetail }>(`/api/automations/${workflowId}`, { steps });
      setWorkflow((prev) => (prev ? { ...prev, graph: res.workflow.graph } : prev));
    } catch (err) {
      toast({ title: "Couldn't save steps", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }
  function openEdit(s: WorkflowStep) {
    setEditing(s);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function move(index: number, direction: -1 | 1) {
    const steps = workflow!.graph.steps;
    const other = index + direction;
    if (other < 0 || other >= steps.length) return;
    const next = [...steps];
    [next[index], next[other]] = [next[other]!, next[index]!];
    await saveSteps(next);
  }

  async function removeStep(s: WorkflowStep) {
    if (!confirm("Remove this step?")) return;
    await saveSteps(workflow!.graph.steps.filter((x) => x.id !== s.id));
  }

  async function upsertStep(step: WorkflowStep) {
    const steps = workflow!.graph.steps;
    const exists = steps.some((s) => s.id === step.id);
    const next = exists ? steps.map((s) => (s.id === step.id ? step : s)) : [...steps, step];
    await saveSteps(next);
    setDialogOpen(false);
    toast({ title: exists ? "Step updated" : "Step added", variant: "success" });
  }

  return (
    <div>
      <Link href="/portal/automations" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Automations
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-navy-900 sm:text-2xl">{workflow.name}</h1>

      <div className="space-y-6">
        <SettingsCard workflow={workflow} canEdit={canEdit} onSaved={setWorkflow} />

        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Steps</p>
              {canEdit && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add Step
                </Button>
              )}
            </div>
            {workflow.graph.steps.length === 0 ? (
              <EmptyState title="No steps yet" description="Add what should happen when this automation runs." action={canEdit && <Button onClick={openCreate}>Add Step</Button>} />
            ) : (
              <ul className="divide-y divide-navy-50">
                {workflow.graph.steps.map((step, i) => {
                  const Icon = STEP_ICON[step.kind];
                  return (
                    <li key={step.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-500">{i + 1}</span>
                      {canEdit && (
                        <div className="flex flex-col">
                          <button onClick={() => move(i, -1)} disabled={i === 0 || busy} className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer" aria-label="Move up">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => move(i, 1)} disabled={i === workflow.graph.steps.length - 1 || busy} className="text-navy-300 hover:text-navy-700 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer" aria-label="Move down">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <Icon className="h-4 w-4 shrink-0 text-coral-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-navy-900">{STEP_KIND_LABEL[step.kind]}</p>
                        <p className="truncate text-xs text-navy-400">{stepSummary(step, templates, users)}</p>
                      </div>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" aria-label="Edit step" onClick={() => openEdit(step)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Delete step" disabled={busy} onClick={() => removeStep(step)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <RunsCard runs={workflow.runs} />
      </div>

      <StepDialog key={formKey} open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} templates={templates} users={users} onSave={upsertStep} />
    </div>
  );
}

function SettingsCard({ workflow, canEdit, onSaved }: { workflow: WorkflowDetail; canEdit: boolean; onSaved: (w: WorkflowDetail) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(workflow.name);
  const [triggerType, setTriggerType] = useState(workflow.triggerType);
  const [status, setStatus] = useState(workflow.status);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await apiPatch<{ workflow: WorkflowDetail }>(`/api/automations/${workflow.id}`, { name, triggerType, status });
      onSaved({ ...workflow, ...res.workflow });
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} disabled={!canEdit}>
              <option value="DRAFT">Draft (not running)</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Trigger — run this when…</Label>
          <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} disabled={!canEdit}>
            {WORKFLOW_TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RunsCard({ runs }: { runs: RunRow[] }) {
  return (
    <Card className="overflow-x-auto">
      <div className="p-5 pb-0">
        <p className="text-sm font-semibold text-navy-900">Recent Runs</p>
      </div>
      {runs.length === 0 ? (
        <EmptyState title="No runs yet" description="Runs will appear here once this automation's trigger fires." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Status</TH>
              <TH>Contact</TH>
              <TH>Started</TH>
              <TH>Completed</TH>
            </TR>
          </THead>
          <TBody>
            {runs.map((r) => (
              <TR key={r.id}>
                <TD>
                  <Badge variant={RUN_STATUS_VARIANT[r.status]} dot>
                    {r.status}
                  </Badge>
                </TD>
                <TD>{r.contact ? `${r.contact.firstName} ${r.contact.lastName ?? ""}` : "—"}</TD>
                <TD>{formatDateTime(r.startedAt)}</TD>
                <TD>{r.completedAt ? formatDateTime(r.completedAt) : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function StepDialog({
  open,
  onClose,
  editing,
  templates,
  users,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: WorkflowStep | null;
  templates: Template[];
  users: UserOption[];
  onSave: (s: WorkflowStep) => Promise<void>;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<WorkflowStep["kind"]>(editing?.kind ?? "SEND_EMAIL");
  const [templateId, setTemplateId] = useState(editing?.kind === "SEND_EMAIL" ? editing.templateId : (templates[0]?.id ?? ""));
  const [title, setTitle] = useState(editing?.kind === "CREATE_TASK" || editing?.kind === "SEND_NOTIFICATION" ? editing.title : "");
  const [assignedUserId, setAssignedUserId] = useState(editing?.kind === "CREATE_TASK" ? (editing.assignedUserId ?? "") : "");
  const [tagName, setTagName] = useState(editing?.kind === "ADD_TAG" ? editing.tagName : "");
  const [field, setField] = useState(editing?.kind === "CONDITION" ? editing.field : CONTACT_CONDITION_FIELDS[0]);
  const [operator, setOperator] = useState<"equals" | "not_equals">(editing?.kind === "CONDITION" ? editing.operator : "equals");
  const [value, setValue] = useState(editing?.kind === "CONDITION" ? editing.value : "");
  const [amount, setAmount] = useState(editing?.kind === "DELAY" ? editing.amount : 1);
  const [unit, setUnit] = useState<"minutes" | "hours" | "days">(editing?.kind === "DELAY" ? editing.unit : "hours");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const id = editing?.id ?? `step_${Date.now()}`;
    let step: WorkflowStep;
    if (kind === "SEND_EMAIL") {
      if (!templateId) return toast({ title: "Choose a template", variant: "error" });
      step = { id, kind, templateId };
    } else if (kind === "CREATE_TASK") {
      if (!title.trim()) return toast({ title: "Enter a task title", variant: "error" });
      step = { id, kind, title, assignedUserId: assignedUserId || undefined };
    } else if (kind === "ADD_TAG") {
      if (!tagName.trim()) return toast({ title: "Enter a tag name", variant: "error" });
      step = { id, kind, tagName };
    } else if (kind === "SEND_NOTIFICATION") {
      if (!title.trim()) return toast({ title: "Enter a notification title", variant: "error" });
      step = { id, kind, title };
    } else if (kind === "CONDITION") {
      if (!value.trim()) return toast({ title: "Enter a value to compare", variant: "error" });
      step = { id, kind, field, operator, value };
    } else {
      step = { id, kind, amount, unit };
    }

    setSaving(true);
    try {
      await onSave(step);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit Step" : "Add Step"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            {editing ? "Save changes" : "Add Step"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Step type</Label>
          <Select value={kind} onChange={(e) => setKind(e.target.value as WorkflowStep["kind"])} disabled={Boolean(editing)}>
            {(Object.keys(STEP_KIND_LABEL) as WorkflowStep["kind"][]).map((k) => (
              <option key={k} value={k}>
                {STEP_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>

        {kind === "SEND_EMAIL" && (
          <div>
            <Label>Template</Label>
            {templates.length === 0 ? (
              <FieldHint>Create an email template first (Emails → Templates).</FieldHint>
            ) : (
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {(kind === "CREATE_TASK" || kind === "SEND_NOTIFICATION") && (
          <div>
            <Label>{kind === "CREATE_TASK" ? "Task title" : "Notification title"}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up with {{firstName}}" autoFocus />
            <FieldHint>You can use {"{{firstName}}"}, {"{{lastName}}"} or {"{{company}}"}.</FieldHint>
          </div>
        )}

        {kind === "CREATE_TASK" && (
          <div>
            <Label>Assign to (optional)</Label>
            <Select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {kind === "ADD_TAG" && (
          <div>
            <Label>Tag name</Label>
            <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Hot Lead" autoFocus />
          </div>
        )}

        {kind === "CONDITION" && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Field</Label>
              <Select value={field} onChange={(e) => setField(e.target.value)}>
                {CONTACT_CONDITION_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Operator</Label>
              <Select value={operator} onChange={(e) => setOperator(e.target.value as typeof operator)}>
                <option value="equals">is</option>
                <option value="not_equals">is not</option>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          </div>
        )}

        {kind === "DELAY" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </Select>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

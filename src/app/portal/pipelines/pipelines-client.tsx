"use client";

import { useEffect, useState } from "react";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Plus, User as UserIcon, Calendar, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
}
interface UserOption {
  id: string;
  name: string;
}
interface Card {
  id: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: string | number | null;
  notes: string | null;
  dueDate: string | null;
  contact: Contact | null;
  assignedUser: UserOption | null;
}
interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
}
interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
  cards: Card[];
}

export function PipelinesClient({
  contacts,
  users,
  canCreate,
  canEdit,
  canDelete,
}: {
  contacts: Contact[];
  users: UserOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [cardDialog, setCardDialog] = useState<{ stageId: string; card: Card | null } | null>(null);

  useEffect(() => {
    apiFetch<{ pipelines: Pipeline[] }>("/api/pipelines").then((res) => {
      setPipelines(res.pipelines);
      setActiveId((cur) => cur ?? res.pipelines[0]?.id ?? null);
    });
  }, []);

  const active = pipelines?.find((p) => p.id === activeId) ?? null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleDragEnd(event: DragEndEvent) {
    if (!active) return;
    const { active: dragged, over } = event;
    if (!over) return;
    const cardId = String(dragged.id);
    const targetStageId = String(over.id);
    const card = active.cards.find((c) => c.id === cardId);
    if (!card || card.stageId === targetStageId) return;

    setPipelines((prev) =>
      prev
        ? prev.map((p) => (p.id !== active.id ? p : { ...p, cards: p.cards.map((c) => (c.id === cardId ? { ...c, stageId: targetStageId } : c)) }))
        : prev,
    );

    try {
      await apiPatch(`/api/pipeline-cards/${cardId}`, { stageId: targetStageId });
    } catch {
      toast({ title: "Couldn't move card", variant: "error" });
      apiFetch<{ pipelines: Pipeline[] }>("/api/pipelines").then((res) => setPipelines(res.pipelines));
    }
  }

  function updatePipelineInState(updated: Pipeline) {
    setPipelines((prev) => (prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev));
  }

  async function addStage(name: string) {
    if (!active) return;
    try {
      const res = await apiPost<{ stage: Stage }>(`/api/pipelines/${active.id}/stages`, { name });
      updatePipelineInState({ ...active, stages: [...active.stages, res.stage] });
    } catch (err) {
      toast({ title: "Couldn't add stage", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    }
  }

  if (pipelines === null) return <PageSpinner />;

  if (pipelines.length === 0) {
    return (
      <div>
        <SectionHeader canCreate={canCreate} onNew={() => setNewPipelineOpen(true)} />
        <EmptyState title="No pipelines yet" description="Create a pipeline to start tracking leads or jobs through stages." />
        <NewPipelineDialog open={newPipelineOpen} onClose={() => setNewPipelineOpen(false)} onCreated={(p) => { setPipelines([p]); setActiveId(p.id); }} />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader canCreate={canCreate} onNew={() => setNewPipelineOpen(true)} />

      {pipelines.length > 1 && (
        <Tabs value={activeId ?? undefined} onChange={setActiveId} className="mb-4">
          <TabsList>
            {pipelines.map((p) => (
              <TabsTrigger key={p.id} value={p.id}>
                {p.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {active && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {active.stages
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  cards={active.cards.filter((c) => c.stageId === stage.id)}
                  canCreate={canCreate}
                  onAddCard={() => setCardDialog({ stageId: stage.id, card: null })}
                  onCardClick={(card) => setCardDialog({ stageId: card.stageId, card })}
                />
              ))}
            {canEdit && <AddStageColumn onAdd={addStage} />}
          </div>
        </DndContext>
      )}

      {active && cardDialog && (
        <CardFormDialog
          open={Boolean(cardDialog)}
          onClose={() => setCardDialog(null)}
          pipeline={active}
          stageId={cardDialog.stageId}
          card={cardDialog.card}
          contacts={contacts}
          users={users}
          canDelete={canDelete}
          onSaved={(card, isNew) => {
            const cards = isNew ? [...active.cards, card] : active.cards.map((c) => (c.id === card.id ? card : c));
            updatePipelineInState({ ...active, cards });
            setCardDialog(null);
          }}
          onDeleted={(id) => {
            updatePipelineInState({ ...active, cards: active.cards.filter((c) => c.id !== id) });
            setCardDialog(null);
          }}
        />
      )}

      <NewPipelineDialog
        open={newPipelineOpen}
        onClose={() => setNewPipelineOpen(false)}
        onCreated={(p) => {
          setPipelines((prev) => [...(prev ?? []), p]);
          setActiveId(p.id);
        }}
      />
    </div>
  );
}

function SectionHeader({ canCreate, onNew }: { canCreate: boolean; onNew: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">Pipeline</h1>
        <p className="mt-1 text-sm text-navy-400">Drag cards between stages as deals or jobs progress.</p>
      </div>
      {canCreate && (
        <Button variant="outline" onClick={onNew}>
          <Plus className="h-4 w-4" /> New Pipeline
        </Button>
      )}
    </div>
  );
}

function StageColumn({
  stage,
  cards,
  canCreate,
  onAddCard,
  onCardClick,
}: {
  stage: Stage;
  cards: Card[];
  canCreate: boolean;
  onAddCard: () => void;
  onCardClick: (card: Card) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = cards.reduce((sum, c) => sum + Number(c.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl border border-navy-100 bg-navy-50/40 transition-colors",
        isOver && "border-coral-300 bg-coral-50/50",
      )}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
            <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
            {stage.name}
            <span className="text-navy-400">({cards.length})</span>
          </p>
          {total > 0 && <p className="mt-0.5 text-xs text-navy-400">{formatCurrency(total)}</p>}
        </div>
        {canCreate && (
          <button onClick={onAddCard} className="rounded-lg p-1 text-navy-400 hover:bg-white hover:text-coral-500 cursor-pointer">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex min-h-[80px] flex-1 flex-col gap-2 px-2 pb-3">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} onClick={() => onCardClick(card)} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  // The whole card is the drag handle — dnd-kit's PointerSensor activation
  // distance (see `sensors` above) already tells a click (no movement) apart
  // from a drag (movement past the threshold), so onClick still opens the
  // card normally when the user isn't dragging.
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group rounded-xl border border-navy-100 bg-white p-3 shadow-sm cursor-grab hover:border-coral-200 active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-lg",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-navy-200 opacity-0 group-hover:opacity-100" />
        <p className="flex-1 text-sm font-medium text-navy-900">{card.title}</p>
      </div>
      {card.value != null && <p className="mt-1 pl-5 text-sm font-semibold text-coral-600">{formatCurrency(Number(card.value))}</p>}
      <div className="mt-2 flex items-center justify-between pl-5">
        <div className="flex items-center gap-1.5">
          {card.dueDate && (
            <span className="flex items-center gap-1 text-xs text-navy-400">
              <Calendar className="h-3 w-3" /> {formatDate(card.dueDate)}
            </span>
          )}
        </div>
        {card.assignedUser ? (
          <Avatar name={card.assignedUser.name} size={22} />
        ) : (
          <UserIcon className="h-4 w-4 text-navy-200" />
        )}
      </div>
    </div>
  );
}

function AddStageColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex w-72 shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200 py-6 text-sm font-medium text-navy-400 hover:border-coral-300 hover:text-coral-600 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Add stage
      </button>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-navy-100 bg-navy-50/40 p-3">
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Stage name" />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (name.trim()) onAdd(name.trim());
            setName("");
            setAdding(false);
          }}
        >
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function NewPipelineDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (pipeline: Pipeline) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [stages, setStages] = useState("New, Contacted, Qualified, Won, Lost");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost<{ pipeline: Pipeline }>("/api/pipelines", {
        name,
        stageNames: stages.split(",").map((s) => s.trim()).filter(Boolean),
      });
      onCreated(res.pipeline);
      onClose();
      setName("");
      toast({ title: "Pipeline created", variant: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="New pipeline">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <div>
          <Label>Pipeline name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Pipeline" />
        </div>
        <div>
          <Label>Stages (comma separated)</Label>
          <Input value={stages} onChange={(e) => setStages(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create pipeline
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CardFormDialog({
  open,
  onClose,
  pipeline,
  stageId,
  card,
  contacts,
  users,
  canDelete,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  pipeline: Pipeline;
  stageId: string;
  card: Card | null;
  contacts: Contact[];
  users: UserOption[];
  canDelete: boolean;
  onSaved: (card: Card, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => ({
    title: card?.title ?? "",
    value: card?.value != null ? String(card.value) : "",
    contactId: card?.contact?.id ?? "",
    assignedUserId: card?.assignedUser?.id ?? "",
    dueDate: card?.dueDate ? card.dueDate.slice(0, 10) : "",
    notes: card?.notes ?? "",
    stageId: card?.stageId ?? stageId,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        pipelineId: pipeline.id,
        stageId: form.stageId,
        title: form.title,
        value: form.value ? Number(form.value) : null,
        contactId: form.contactId || null,
        assignedUserId: form.assignedUserId || null,
        dueDate: form.dueDate || null,
        notes: form.notes,
      };
      const res = card
        ? await apiPatch<{ card: Card }>(`/api/pipeline-cards/${card.id}`, payload)
        : await apiPost<{ card: Card }>("/api/pipeline-cards", payload);
      onSaved(res.card, !card);
      toast({ title: card ? "Card updated" : "Card created", variant: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!card || !confirm("Delete this card?")) return;
    try {
      await apiDelete(`/api/pipeline-cards/${card.id}`);
      onDeleted(card.id);
      toast({ title: "Card deleted", variant: "success" });
    } catch {
      toast({ title: "Couldn't delete card", variant: "error" });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={card ? "Edit card" : "New card"}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <div>
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Value</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={form.stageId} onChange={(e) => setForm({ ...form, stageId: e.target.value })}>
              {pipeline.stages
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Contact</Label>
            <Select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
              <option value="">None</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Assigned to</Label>
            <Select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex items-center justify-between pt-2">
          {card && canDelete ? (
            <Button type="button" variant="ghost" className="text-danger" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {card ? "Save changes" : "Create card"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

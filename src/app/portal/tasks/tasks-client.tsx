"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Plus, List, Kanban, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, Checkbox } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatDate, formatDateTime, cn } from "@/lib/utils";

interface UserOption {
  id: string;
  name: string;
}
interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "WAITING" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  assignedUser: UserOption | null;
  relatedContact: ContactOption | null;
  comments: { id: string }[];
}

const STATUSES: { key: Task["status"]; label: string }[] = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "WAITING", label: "Waiting" },
  { key: "COMPLETED", label: "Completed" },
];

const PRIORITY_VARIANT: Record<Task["priority"], "neutral" | "warning" | "coral" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "neutral",
  HIGH: "warning",
  URGENT: "danger",
};

export function TasksClient({
  users,
  contacts,
  canCreate,
  canEdit,
  canDelete,
}: {
  users: UserOption[];
  contacts: ContactOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [view, setView] = useState<"list" | "kanban" | "calendar">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Task | null>(null);

  useEffect(() => {
    apiFetch<{ tasks: Task[] }>("/api/tasks").then((res) => setTasks(res.tasks));
  }, []);

  function openNew() {
    setFormKey((k) => k + 1);
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(task: Task) {
    setFormKey((k) => k + 1);
    setEditing(task);
    setFormOpen(true);
  }

  function onSaved(task: Task, isNew: boolean) {
    setTasks((prev) => (!prev ? prev : isNew ? [task, ...prev] : prev.map((t) => (t.id === task.id ? task : t))));
    setFormOpen(false);
  }

  async function onToggleComplete(task: Task) {
    const nextStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    setTasks((prev) => (prev ? prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)) : prev));
    try {
      await apiPatch(`/api/tasks/${task.id}`, { status: nextStatus });
    } catch {
      toast({ title: "Couldn't update task", variant: "error" });
    }
  }

  async function onDelete(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await apiDelete(`/api/tasks/${task.id}`);
      setTasks((prev) => (prev ? prev.filter((t) => t.id !== task.id) : prev));
      setFormOpen(false);
      toast({ title: "Task deleted", variant: "success" });
    } catch {
      toast({ title: "Couldn't delete task", variant: "error" });
    }
  }

  async function onMoveStatus(taskId: string, status: Task["status"]) {
    setTasks((prev) => (prev ? prev.map((t) => (t.id === taskId ? { ...t, status } : t)) : prev));
    try {
      await apiPatch(`/api/tasks/${taskId}`, { status });
    } catch {
      toast({ title: "Couldn't move task", variant: "error" });
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">Tasks</h1>
          <p className="mt-1 text-sm text-navy-400">{tasks?.length ?? 0} task{tasks?.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-navy-100 bg-white p-1">
            <ViewButton active={view === "list"} onClick={() => setView("list")} icon={<List className="h-4 w-4" />} label="List" />
            <ViewButton active={view === "kanban"} onClick={() => setView("kanban")} icon={<Kanban className="h-4 w-4" />} label="Kanban" />
            <ViewButton active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarIcon className="h-4 w-4" />} label="Calendar" />
          </div>
          {canCreate && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          )}
        </div>
      </div>

      {tasks === null ? (
        <PageSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks yet" description={canCreate ? "Create a task to start tracking work." : undefined} />
      ) : view === "list" ? (
        <ListView tasks={tasks} onToggle={onToggleComplete} onEdit={openEdit} canEdit={canEdit} />
      ) : view === "kanban" ? (
        <KanbanView tasks={tasks} onMove={onMoveStatus} onEdit={openEdit} />
      ) : (
        <CalendarView tasks={tasks} onEdit={openEdit} />
      )}

      <TaskFormDialog
        key={formKey}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editing}
        users={users}
        contacts={contacts}
        canDelete={canDelete}
        onSaved={onSaved}
        onDelete={editing ? () => onDelete(editing) : undefined}
      />
    </div>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium cursor-pointer",
        active ? "bg-navy-900 text-white" : "text-navy-500 hover:bg-navy-50",
      )}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ListView({
  tasks,
  onToggle,
  onEdit,
  canEdit,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  canEdit: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
        if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }),
    [tasks],
  );

  return (
    <Table>
      <THead>
        <TR>
          <TH />
          <TH>Task</TH>
          <TH>Priority</TH>
          <TH>Assigned</TH>
          <TH>Related</TH>
          <TH>Due</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {sorted.map((t) => (
          <TR key={t.id}>
            <TD>
              <Checkbox checked={t.status === "COMPLETED"} onChange={() => onToggle(t)} disabled={!canEdit} />
            </TD>
            <TD>
              <button onClick={() => onEdit(t)} className={cn("text-left font-medium hover:underline cursor-pointer", t.status === "COMPLETED" ? "text-navy-400 line-through" : "text-navy-900")}>
                {t.title}
              </button>
            </TD>
            <TD>
              <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
            </TD>
            <TD>{t.assignedUser ? <div className="flex items-center gap-1.5"><Avatar name={t.assignedUser.name} size={22} /> {t.assignedUser.name}</div> : "—"}</TD>
            <TD>{t.relatedContact ? `${t.relatedContact.firstName} ${t.relatedContact.lastName ?? ""}` : "—"}</TD>
            <TD className={cn("whitespace-nowrap text-sm", t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED" ? "font-medium text-danger" : "text-navy-500")}>
              {t.dueDate ? formatDate(t.dueDate) : "—"}
            </TD>
            <TD>
              <Badge variant={t.status === "COMPLETED" ? "success" : "neutral"}>{STATUSES.find((s) => s.key === t.status)?.label}</Badge>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function KanbanView({ tasks, onMove, onEdit }: { tasks: Task[]; onMove: (id: string, status: Task["status"]) => void; onEdit: (task: Task) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find((t) => t.id === String(active.id));
    const targetStatus = String(over.id) as Task["status"];
    if (task && task.status !== targetStatus) onMove(task.id, targetStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {STATUSES.map((s) => (
          <TaskColumn key={s.key} status={s.key} label={s.label} tasks={tasks.filter((t) => t.status === s.key)} onEdit={onEdit} />
        ))}
      </div>
    </DndContext>
  );
}

function TaskColumn({ status, label, tasks, onEdit }: { status: Task["status"]; label: string; tasks: Task[]; onEdit: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn("flex w-72 shrink-0 flex-col rounded-2xl border border-navy-100 bg-navy-50/40", isOver && "border-coral-300 bg-coral-50/50")}>
      <div className="px-3 py-3 text-sm font-semibold text-navy-900">
        {label} <span className="text-navy-400">({tasks.length})</span>
      </div>
      <div className="flex min-h-[80px] flex-1 flex-col gap-2 px-2 pb-3">
        {tasks.map((t) => (
          <DraggableTaskCard key={t.id} task={t} onClick={() => onEdit(t)} />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn("cursor-grab rounded-xl border border-navy-100 bg-white p-3 shadow-sm hover:border-coral-200 active:cursor-grabbing", isDragging && "z-10 opacity-70 shadow-lg")}
    >
      <p className="text-sm font-medium text-navy-900">{task.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
        {task.assignedUser && <Avatar name={task.assignedUser.name} size={22} />}
      </div>
      {task.dueDate && <p className="mt-1.5 text-xs text-navy-400">{formatDate(task.dueDate)}</p>}
    </div>
  );
}

function CalendarView({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function goToMonth(y: number, m: number) {
    // normalize (m can be -1 or 12 from prev/next) the same way `new Date(y, m, 1)` would
    const d = new Date(y, m, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(t);
      }
    }
    return map;
  }, [tasks, year, month]);

  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = new Date();

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-900">
          {firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <button onClick={() => goToMonth(year, month - 1)} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => goToMonth(now.getFullYear(), now.getMonth())} className="rounded-lg px-2 py-1 text-xs font-medium text-navy-500 hover:bg-navy-50 cursor-pointer">
            Today
          </button>
          <button onClick={() => goToMonth(year, month + 1)} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-navy-100 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-navy-50 px-2 py-1.5 text-center font-semibold text-navy-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayTasks = day ? (tasksByDay.get(day) ?? []) : [];
          return (
            <div key={i} className="min-h-[90px] bg-white p-1.5">
              {day && (
                <>
                  <p className={cn("mb-1 text-xs", isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-coral-500 font-semibold text-white" : "text-navy-400")}>{day}</p>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onEdit(t)}
                        className={cn(
                          "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium cursor-pointer",
                          t.status === "COMPLETED" ? "bg-navy-50 text-navy-300 line-through" : "bg-coral-50 text-coral-700",
                        )}
                      >
                        {t.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && <p className="text-[10px] text-navy-300">+{dayTasks.length - 3} more</p>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskFormDialog({
  open,
  onClose,
  task,
  users,
  contacts,
  canDelete,
  onSaved,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  users: UserOption[];
  contacts: ContactOption[];
  canDelete: boolean;
  onSaved: (task: Task, isNew: boolean) => void;
  onDelete?: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => ({
    title: task?.title ?? "",
    description: task?.description ?? "",
    assignedUserId: task?.assignedUser?.id ?? "",
    relatedContactId: task?.relatedContact?.id ?? "",
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : "",
    priority: task?.priority ?? "MEDIUM",
    status: task?.status ?? "TODO",
  }));
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ id: string; body: string; createdAt: string; author: { name: string } }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No `else` branch needed: the parent remounts this dialog (via `key`) fresh
    // each time it opens, so `comments` already starts at [] for a new task.
    if (task) {
      apiFetch<{ task: { comments: typeof comments } }>(`/api/tasks/${task.id}`).then((res) => setComments(res.task.comments));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, assignedUserId: form.assignedUserId || null, relatedContactId: form.relatedContactId || null, dueDate: form.dueDate || null };
      const res = task
        ? await apiPatch<{ task: Task }>(`/api/tasks/${task.id}`, payload)
        : await apiPost<{ task: Task }>("/api/tasks", payload);
      onSaved(res.task, !task);
      toast({ title: task ? "Task updated" : "Task created", variant: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function submitComment() {
    if (!task || !comment.trim()) return;
    try {
      const res = await apiPost<{ comment: (typeof comments)[number] }>(`/api/tasks/${task.id}/comments`, { body: comment });
      setComments((prev) => [...prev, res.comment]);
      setComment("");
    } catch {
      toast({ title: "Couldn't add comment", variant: "error" });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <div>
          <Label>Title</Label>
          <Input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Task["status"] })}>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <Label>Due date</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Related contact</Label>
          <Select value={form.relatedContactId} onChange={(e) => setForm({ ...form, relatedContactId: e.target.value })}>
            <option value="">None</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </Select>
        </div>

        {task && (
          <div className="border-t border-navy-100 pt-3">
            <Label>Comments</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto scrollbar-thin">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-navy-50 px-3 py-2 text-sm">
                  <p className="text-navy-700">{c.body}</p>
                  <p className="mt-0.5 text-[11px] text-navy-300">
                    {c.author.name} · {formatDateTime(c.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
              <Button type="button" size="sm" variant="outline" onClick={submitComment} disabled={!comment.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {task && canDelete && onDelete ? (
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
              {task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

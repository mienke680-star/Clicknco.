"use client";

import * as React from "react";
import { IconCheck, IconTrash } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost, apiPatch, apiDelete, apiFetch } from "@/lib/api-client";
import { DURATION_OPTIONS, durationLabel, findOverlap, dateKeyOfInstant, timeKeyOfInstant } from "@/lib/clickco/calendar-calc";
import type { CalendarEventDTO } from "@/lib/clickco/calendar";
import type { CalendarEventKind } from "@/generated/prisma/client";

const KIND_OPTIONS: { value: CalendarEventKind; label: string }[] = [
  { value: "TASK", label: "Task" },
  { value: "MEETING", label: "Meeting" },
  { value: "CLIENT_WORK", label: "Client work" },
  { value: "DEADLINE", label: "Deadline" },
];

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface EventDialogProps {
  onClose: () => void;
  /** Date to prefill for a new event ("YYYY-MM-DD"). Ignored when editEventId is set. */
  date: string;
  /** When set, fetches and edits this existing event instead of creating one. */
  editEventId?: string;
  contacts: ContactOption[];
  canDelete: boolean;
  onSaved: (event: CalendarEventDTO) => void;
  onDeleted?: (id: string) => void;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function EventDialog({ onClose, date, editEventId, contacts, canDelete, onSaved, onDeleted }: EventDialogProps) {
  const toast = useHubToast();
  const [loaded, setLoaded] = React.useState(!editEventId);
  const [title, setTitle] = React.useState("");
  const [eventDate, setEventDate] = React.useState(date);
  const [time, setTime] = React.useState("09:00");
  const [durationMinutes, setDurationMinutes] = React.useState(30);
  const [kind, setKind] = React.useState<CalendarEventKind>("TASK");
  const [contactId, setContactId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [overlap, setOverlap] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [titleError, setTitleError] = React.useState(false);

  React.useEffect(() => {
    if (!editEventId) return;
    let cancelled = false;
    apiFetch<{ event: CalendarEventDTO }>(`/api/clickco/calendar-events/${editEventId}`)
      .then((res) => {
        if (cancelled) return;
        const e = res.event;
        setTitle(e.title);
        setEventDate(dateKeyOfInstant(e.startAt));
        setTime(timeKeyOfInstant(e.startAt));
        setDurationMinutes(e.durationMinutes);
        setKind(e.kind);
        setContactId(e.contactId ?? "");
        setNotes(e.notes ?? "");
        setDone(e.done);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          toast.show("Couldn't load this item", "error");
          onClose();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editEventId]);

  React.useEffect(() => {
    if (!eventDate || !time) return;
    let cancelled = false;
    apiFetch<{ events: CalendarEventDTO[] }>(`/api/clickco/calendar-events?date=${eventDate}`)
      .then((res) => {
        if (cancelled) return;
        const others = res.events.map((e) => ({ id: e.id, time: timeKeyOfInstant(e.startAt), durationMinutes: e.durationMinutes, title: e.title }));
        const hit = findOverlap(time, durationMinutes, others, editEventId);
        setOverlap(hit ? `Overlaps "${hit.title}" (${hit.time}). You can still save.` : null);
      })
      .catch(() => {
        if (!cancelled) setOverlap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [eventDate, time, durationMinutes, editEventId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setSaving(true);
    try {
      const body = { title: title.trim(), date: eventDate, time, durationMinutes, kind, contactId: contactId || null, notes: notes.trim() };
      const result = editEventId
        ? await apiPatch<{ event: CalendarEventDTO }>(`/api/clickco/calendar-events/${editEventId}`, { ...body, done })
        : await apiPost<{ event: CalendarEventDTO }>("/api/clickco/calendar-events", body);
      onSaved(result.event);
    } catch {
      toast.show("Couldn't save this item", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editEventId) return;
    setSaving(true);
    try {
      await apiDelete(`/api/clickco/calendar-events/${editEventId}`);
      onDeleted?.(editEventId);
    } catch {
      toast.show("Couldn't delete this item", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>{editEventId ? "Edit schedule item" : "Add to schedule"}</small>
            <h2>{editEventId ? title || "…" : "Plan a task or appointment"}</h2>
          </div>
        </div>
        {!loaded ? (
          <div className="dlg-body">
            <p style={{ color: "var(--muted)" }}>Loading…</p>
          </div>
        ) : (
          <div className="dlg-body">
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError(false);
                }}
                placeholder="What needs to happen?"
                autoFocus
                required
                aria-invalid={titleError || undefined}
              />
              {titleError && <small className="err">Add a title so you can find this later.</small>}
            </label>
            <div className="grid-3">
              <label className="field">
                <span>Date</span>
                <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
              </label>
              <label className="field">
                <span>Start time</span>
                <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </label>
              <label className="field">
                <span>Length</span>
                <select className="input" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {durationLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {overlap && (
              <p className="pill warn" style={{ height: "auto", padding: "8px 12px", whiteSpace: "normal" }}>
                {overlap}
              </p>
            )}
            <div className="grid-2">
              <label className="field">
                <span>Type</span>
                <select className="input" value={kind} onChange={(e) => setKind(e.target.value as CalendarEventKind)}>
                  {KIND_OPTIONS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Client</span>
                <select className="input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                  <option value="">Click & Co (internal)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName ?? ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Working notes</span>
              <textarea className="input" rows={3} placeholder="Context, links, talking points or the next action" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            {editEventId && (
              <label className="check-row">
                <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} /> Mark as completed
              </label>
            )}
          </div>
        )}
        <div className="dlg-foot">
          {editEventId && canDelete ? (
            <button type="button" className="btn btn-danger" disabled={saving} onClick={remove}>
              <IconTrash className="i sm" stroke={1.75} /> Delete
            </button>
          ) : (
            <span></span>
          )}
          <div className="r">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !loaded}>
              <IconCheck className="i sm" stroke={1.75} /> Save
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

"use client";

import * as React from "react";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { dWeek, relDay } from "@/lib/clickco/format";
import { monthGridDays, dateKeyOfUtcDay, todayKey, todayUtcDay, utcDayAdd, KIND_LABEL, KIND_PILL_TONE, KIND_CSS } from "@/lib/clickco/calendar-calc";
import { EventDialog } from "./event-dialog";
import type { CalendarItemWithDate } from "@/lib/clickco/calendar";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

const LEGEND: { kind: keyof typeof KIND_LABEL; color: string }[] = [
  { kind: "MEETING", color: "var(--cyan)" },
  { kind: "CLIENT_WORK", color: "var(--pink)" },
  { kind: "DEADLINE", color: "#e5a22b" },
  { kind: "MONEY", color: "var(--bad)" },
  { kind: "REVIEW", color: "var(--violet)" },
  { kind: "TASK", color: "var(--navy-700)" },
];

export function CalendarClient({
  initialItems,
  initialYear,
  initialMonth,
  contacts,
  canCreate,
  canEdit,
  canDelete,
}: {
  initialItems: CalendarItemWithDate[];
  initialYear: number;
  initialMonth: number;
  contacts: ContactOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth);
  const [mode, setMode] = React.useState<"month" | "agenda">("month");
  const [selectedDate, setSelectedDate] = React.useState(todayKey());
  const [loading, setLoading] = React.useState(false);
  const [dialog, setDialog] = React.useState<{ date: string; editId?: string } | null>(null);

  const itemsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarItemWithDate[]>();
    for (const item of items) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return map;
  }, [items]);

  function mergeItems(fresh: CalendarItemWithDate[], from: string, to: string) {
    setItems((prev) => {
      const kept = prev.filter((i) => i.date < from || i.date > to);
      return [...kept, ...fresh];
    });
  }

  async function loadMonth(y: number, m: number) {
    setLoading(true);
    try {
      const days = monthGridDays(y, m);
      const from = dateKeyOfUtcDay(days[0]!);
      const to = dateKeyOfUtcDay(days[days.length - 1]!);
      const res = await apiFetch<{ items: CalendarItemWithDate[] }>(`/api/clickco/calendar?from=${from}&to=${to}`);
      mergeItems(res.items, from, to);
    } catch {
      // keep whatever's already loaded
    } finally {
      setLoading(false);
    }
  }

  function changeMonth(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setYear(y);
    setMonth(m);
    void loadMonth(y, m);
  }

  function goToday() {
    const today = todayUtcDay();
    setYear(today.getUTCFullYear());
    setMonth(today.getUTCMonth());
    setSelectedDate(todayKey());
    void loadMonth(today.getUTCFullYear(), today.getUTCMonth());
  }

  function upsertEvent() {
    // The server response's startAt could land in a different day/month than
    // what's currently loaded (the user retimed it) -- simplest correct fix
    // is reloading whichever range is on screen rather than patching items
    // in place.
    if (mode === "month") void loadMonth(year, month);
    else void loadAgenda();
    setDialog(null);
  }

  function removeEvent(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDialog(null);
  }

  async function loadAgenda() {
    setLoading(true);
    try {
      const from = todayKey();
      const to = dateKeyOfUtcDay(utcDayAdd(todayUtcDay(), 28));
      const res = await apiFetch<{ items: CalendarItemWithDate[] }>(`/api/clickco/calendar?from=${from}&to=${to}`);
      mergeItems(res.items, from, to);
    } catch {
      // keep whatever's already loaded
    } finally {
      setLoading(false);
    }
  }

  function openItem(item: CalendarItemWithDate) {
    if (item.href) {
      window.location.href = item.href;
      return;
    }
    if (!canEdit) return;
    setDialog({ date: item.date, editId: item.id });
  }

  const title = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month, 1)));
  const gridDays = React.useMemo(() => monthGridDays(year, month), [year, month]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Plan and deliver</p>
          <h1 tabIndex={-1}>Calendar</h1>
          <p>Meetings, tasks, payment dates, project deadlines and consulting reviews in one place.</p>
        </div>
        {canCreate && (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setDialog({ date: selectedDate })}>
              <IconPlus className="i" stroke={1.75} /> Add item
            </button>
          </div>
        )}
      </div>

      <section className="panel">
        <div className="cal-head">
          <button className="icon-btn sm" onClick={() => changeMonth(-1)} aria-label="Previous month" disabled={mode !== "month"}>
            <IconChevronLeft className="i sm" stroke={1.75} />
          </button>
          <button className="icon-btn sm" onClick={() => changeMonth(1)} aria-label="Next month" disabled={mode !== "month"}>
            <IconChevronRight className="i sm" stroke={1.75} />
          </button>
          <h2>{mode === "month" ? title : "Next 4 weeks"}</h2>
          <button className="btn btn-secondary btn-sm" onClick={goToday}>
            Today
          </button>
          <div className="seg" role="group" aria-label="Calendar view">
            <button aria-pressed={mode === "month"} onClick={() => setMode("month")}>
              Month
            </button>
            <button
              aria-pressed={mode === "agenda"}
              onClick={() => {
                setMode("agenda");
                void loadAgenda();
              }}
            >
              Agenda
            </button>
          </div>
        </div>

        {mode === "month" ? (
          <>
            <div className="cal-grid" role="group" aria-label={title} aria-busy={loading || undefined}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div className="cal-dow" key={d}>
                  {d}
                </div>
              ))}
              {gridDays.map((day) => {
                const key = dateKeyOfUtcDay(day);
                const ev = itemsByDate.get(key) ?? [];
                const out = day.getUTCMonth() !== month;
                return (
                  <button
                    key={key}
                    className={`cal-day ${out ? "out" : ""} ${key === todayKey() ? "today" : ""}`}
                    aria-pressed={selectedDate === key}
                    aria-label={`${dWeek(key)}, ${ev.length} ${ev.length === 1 ? "item" : "items"}`}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span className="dn">{day.getUTCDate()}</span>
                    {ev.slice(0, 3).map((e) => (
                      <span className={`ev ${KIND_CSS[e.kind]} ${e.done ? "done" : ""}`} key={e.id}>
                        {e.time ? `${e.time} ` : ""}
                        {e.label}
                      </span>
                    ))}
                    {ev.length > 3 && <span className="ev task">+{ev.length - 3} more</span>}
                    <span className="dots" aria-hidden="true">
                      {ev.slice(0, 5).map((e) => (
                        <i className={KIND_CSS[e.kind]} key={e.id}></i>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="legend" aria-label="Legend">
              {LEGEND.map((l) => (
                <span key={l.kind}>
                  <i style={{ background: l.color }}></i>
                  {KIND_LABEL[l.kind]}
                </span>
              ))}
            </div>
          </>
        ) : (
          <AgendaBody itemsByDate={itemsByDate} onOpen={openItem} />
        )}
      </section>

      {mode === "month" && (
        <section className="panel" style={{ marginTop: 20 }} aria-labelledby="sel-h">
          <div className="panel-head">
            <div>
              <h2 id="sel-h">{dWeek(selectedDate)}</h2>
              <p>{relDay(selectedDate)}</p>
            </div>
            {canCreate && (
              <button className="btn btn-secondary btn-sm" onClick={() => setDialog({ date: selectedDate })}>
                <IconPlus className="i sm" stroke={1.75} /> Add item
              </button>
            )}
          </div>
          <div className="agenda-day" style={{ border: 0 }}>
            {(itemsByDate.get(selectedDate) ?? []).length === 0 ? (
              <p style={{ color: "var(--muted)" }}>Nothing planned for this day.</p>
            ) : (
              (itemsByDate.get(selectedDate) ?? []).map((e) => <EventRow key={e.id} item={e} onOpen={openItem} />)
            )}
          </div>
        </section>
      )}

      {dialog && (
        <EventDialog
          key={dialog.editId ?? dialog.date}
          date={dialog.date}
          editEventId={dialog.editId}
          contacts={contacts}
          canDelete={canDelete}
          onClose={() => setDialog(null)}
          onSaved={upsertEvent}
          onDeleted={removeEvent}
        />
      )}
    </>
  );
}

function AgendaBody({ itemsByDate, onOpen }: { itemsByDate: Map<string, CalendarItemWithDate[]>; onOpen: (item: CalendarItemWithDate) => void }) {
  const today = todayKey();
  const todayDay = todayUtcDay();
  const days = Array.from({ length: 28 }, (_, i) => dateKeyOfUtcDay(utcDayAdd(todayDay, i)));
  const nonEmpty = days.filter((d) => (itemsByDate.get(d) ?? []).length > 0);

  if (nonEmpty.length === 0) {
    return (
      <div className="empty">
        <b>Nothing in the next four weeks</b>
        <span>Add a meeting or task to start filling the agenda.</span>
      </div>
    );
  }

  const tomorrow = dateKeyOfUtcDay(utcDayAdd(todayDay, 1));

  return (
    <>
      {nonEmpty.map((d) => (
        <div className="agenda-day" key={d}>
          <h3 className={d === today ? "t" : ""}>
            {d === today ? "Today, " : d === tomorrow ? "Tomorrow, " : ""}
            {dWeek(d)}
          </h3>
          {(itemsByDate.get(d) ?? []).map((e) => (
            <EventRow key={e.id} item={e} onOpen={onOpen} />
          ))}
        </div>
      ))}
    </>
  );
}

function EventRow({ item, onOpen }: { item: CalendarItemWithDate; onOpen: (item: CalendarItemWithDate) => void }) {
  return (
    <button className="ag" onClick={() => onOpen(item)}>
      <time>{item.time || "All day"}</time>
      <span style={{ minWidth: 0 }}>
        <b className="ellip" style={{ display: "block", fontWeight: 600 }}>
          {item.label}
        </b>
        <small className="ellip" style={{ display: "block", color: "var(--muted)", fontSize: 13.5 }}>
          {item.sub}
        </small>
      </span>
      <span className={`pill ${KIND_PILL_TONE[item.kind]}`}>{KIND_LABEL[item.kind]}</span>
    </button>
  );
}

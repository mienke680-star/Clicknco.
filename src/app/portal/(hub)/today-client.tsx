"use client";

import * as React from "react";
import Link from "next/link";
import { IconPlus, IconAlertTriangle, IconFileText, IconClock, IconClipboardCheck, IconCalendarEvent, IconCheck, IconArrowRight } from "@tabler/icons-react";
import { useHubToast } from "@/components/hub/toast";
import { apiPost, apiPatch } from "@/lib/api-client";
import { money, dShort, dLong } from "@/lib/clickco/format";
import { describeAuditAction } from "@/lib/audit-format";
import { parseQuickAdd, todayKey, timeKeyOfInstant, dateKeyOfInstant } from "@/lib/clickco/calendar-calc";
import { EventDialog } from "./calendar/event-dialog";
import type { NeedsYouItem, TodayStats, TodayScheduleItem, ActiveDeliveryItem, RecentActivityItem } from "@/lib/clickco/today";
import type { CalendarEventDTO } from "@/lib/clickco/calendar";

const NEEDS_ICON = {
  "alert-triangle": IconAlertTriangle,
  "file-text": IconFileText,
  clock: IconClock,
  "clipboard-check": IconClipboardCheck,
  "calendar-event": IconCalendarEvent,
};

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

function durLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return `${h % 1 === 0 ? h : h.toFixed(1)} hour${h === 1 ? "" : "s"}`;
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function ago(d: Date): string {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} minutes ago`;
  if (mins < 1440) {
    const h = Math.round(mins / 60);
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.round(mins / 1440);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function TodayClient({
  firstName,
  needsYou: initialNeedsYou,
  stats,
  schedule: initialSchedule,
  activeDelivery,
  activity,
  contacts,
  setupMissing,
  canEditCalendar,
  canCreateCalendar,
  canViewInvoices,
  canViewQuotes,
  canViewProjects,
  canViewBusinessSettings,
}: {
  firstName: string;
  needsYou: NeedsYouItem[];
  stats: TodayStats;
  schedule: TodayScheduleItem[];
  activeDelivery: ActiveDeliveryItem[];
  activity: RecentActivityItem[];
  contacts: ContactOption[];
  setupMissing: boolean;
  canEditCalendar: boolean;
  canCreateCalendar: boolean;
  canViewInvoices: boolean;
  canViewQuotes: boolean;
  canViewProjects: boolean;
  canViewBusinessSettings: boolean;
}) {
  const toast = useHubToast();
  const [needsYou, setNeedsYou] = React.useState(initialNeedsYou);
  const [schedule, setSchedule] = React.useState(initialSchedule);
  const [quickAdd, setQuickAdd] = React.useState("");
  const [quickAdding, setQuickAdding] = React.useState(false);
  const [dialog, setDialog] = React.useState<{ date: string; editId?: string } | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const doneCount = schedule.filter((s) => s.done).length;

  function upsertSchedule(event: CalendarEventDTO) {
    setSchedule((prev) => {
      // A reschedule onto a different day removes it from today's list
      // entirely, rather than showing the wrong day's item here.
      if (dateKeyOfInstant(event.startAt) !== todayKey()) return prev.filter((s) => s.id !== event.id);
      const matches = prev.some((s) => s.id === event.id);
      const next = matches ? prev.map((s) => (s.id === event.id ? toScheduleItem(event) : s)) : [...prev, toScheduleItem(event)];
      return next.sort((a, b) => a.time.localeCompare(b.time));
    });
    setDialog(null);
  }

  function toScheduleItem(event: CalendarEventDTO): TodayScheduleItem {
    return { ...event, time: timeKeyOfInstant(event.startAt) };
  }

  function removeSchedule(id: string) {
    setSchedule((prev) => prev.filter((s) => s.id !== id));
    setDialog(null);
  }

  async function toggleDone(item: TodayScheduleItem) {
    try {
      const result = await apiPatch<{ event: CalendarEventDTO }>(`/api/clickco/calendar-events/${item.id}`, { done: !item.done });
      setSchedule((prev) => prev.map((s) => (s.id === item.id ? toScheduleItem(result.event) : s)));
    } catch {
      toast.show("Couldn't update that item", "error");
    }
  }

  async function dismissMissed(id: string) {
    try {
      await apiPatch(`/api/clickco/calendar-events/${id}`, { done: true });
      setNeedsYou((prev) => prev.filter((n) => n.toggleCalendarEventId !== id));
    } catch {
      toast.show("Couldn't update that item", "error");
    }
  }

  async function submitQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAdd.trim()) {
      toast.show("Add a few words about what to do", "error");
      return;
    }
    const parsed = parseQuickAdd(quickAdd);
    const low = parsed.title.toLowerCase();
    const matchedContact = contacts.find((c) => {
      const name = `${c.firstName} ${c.lastName ?? ""}`.toLowerCase();
      return name
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .some((w) => new RegExp(`\\b${w}\\b`).test(low));
    });
    setQuickAdding(true);
    try {
      const result = await apiPost<{ event: CalendarEventDTO }>("/api/clickco/calendar-events", {
        title: parsed.title,
        date: parsed.date,
        time: parsed.time,
        durationMinutes: parsed.durationMinutes,
        kind: parsed.kind,
        contactId: matchedContact?.id ?? null,
      });
      if (parsed.date === todayKey()) upsertSchedule(result.event);
      setQuickAdd("");
      toast.show("Added to schedule");
    } catch {
      toast.show("Couldn't add that", "error");
    } finally {
      setQuickAdding(false);
    }
  }

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  let nowPlaced = false;
  let prevEnd = -1;
  const rows: { item: TodayScheduleItem; overlap: boolean; showNow: boolean }[] = [];
  for (const item of schedule) {
    const s = toMin(item.time);
    const showNow = !nowPlaced && s > nowMin;
    if (showNow) nowPlaced = true;
    const overlap = s < prevEnd;
    prevEnd = Math.max(prevEnd, s + item.durationMinutes);
    rows.push({ item, overlap, showNow });
  }
  const tailNow = !nowPlaced && schedule.length > 0;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">{dLong(new Date())}</p>
          <h1 tabIndex={-1}>
            {greeting}, {firstName}.
          </h1>
          <p>
            {needsYou.length > 0
              ? `${schedule.length - doneCount} of ${schedule.length} items left today, and ${needsYou.length} ${needsYou.length === 1 ? "thing needs" : "things need"} you.`
              : `${schedule.length - doneCount} of ${schedule.length} items left today. Nothing else is waiting on you.`}
          </p>
        </div>
        {canCreateCalendar && (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setDialog({ date: todayKey() })}>
              <IconPlus className="i" stroke={1.75} /> Add to schedule
            </button>
          </div>
        )}
      </div>

      {setupMissing && canViewBusinessSettings && (
        <div className="setup" role="note">
          <IconAlertTriangle className="i" stroke={1.75} />
          <div>
            <b>Before you send real quotes or invoices</b>
            <p>These appear on every document. Add your banking details and confirm whether prices include VAT.</p>
          </div>
          <Link className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} href="/portal/business">
            Open details
          </Link>
        </div>
      )}

      {(canViewInvoices || canViewQuotes) && (
        <div className="stats">
          {canViewInvoices && (
            <>
              <Link className="stat" href="/portal/invoices">
                <small>Outstanding</small>
                <b className="num">{money(stats.outstanding)}</b>
                <em>
                  {stats.unpaidCount} unpaid {stats.unpaidCount === 1 ? "invoice" : "invoices"}
                </em>
              </Link>
              <Link className="stat" href="/portal/invoices">
                <small>Overdue</small>
                <b className="num">{money(stats.overdue)}</b>
                <em className={stats.overdueCount ? "bad" : "good"}>{stats.overdueCount ? `${stats.overdueCount} ${stats.overdueCount === 1 ? "invoice" : "invoices"} late` : "All on time"}</em>
              </Link>
              <Link className="stat" href="/portal/invoices">
                <small>Collected this month</small>
                <b className="num">{money(stats.collectedThisMonth)}</b>
                <em className="good">Payments received</em>
              </Link>
            </>
          )}
          {canViewQuotes && (
            <Link className="stat" href="/portal/quotes">
              <small>Quotes awaiting reply</small>
              <b className="num">{money(stats.openQuoteValue)}</b>
              <em>
                {stats.openQuoteCount} open {stats.openQuoteCount === 1 ? "quote" : "quotes"}
              </em>
            </Link>
          )}
        </div>
      )}

      <div className="today-grid">
        <div className="stack">
          <section className="panel" aria-labelledby="sch-h">
            <div className="panel-head">
              <div>
                <h2 id="sch-h">Today&apos;s schedule</h2>
                <p>
                  {doneCount} of {schedule.length} done
                </p>
              </div>
              <div style={{ width: 120 }} className="progress" role="progressbar" aria-label="Schedule progress" aria-valuemin={0} aria-valuemax={schedule.length} aria-valuenow={doneCount}>
                <i style={{ width: `${schedule.length ? (doneCount / schedule.length) * 100 : 0}%` }}></i>
              </div>
            </div>
            {canCreateCalendar && (
              <form className="quick" onSubmit={submitQuickAdd}>
                <label className="sr" htmlFor="quick-in">
                  Quick add
                </label>
                <input
                  id="quick-in"
                  className="input"
                  autoComplete="off"
                  placeholder="Quick add: 14:00 call Luma 30m"
                  value={quickAdd}
                  onChange={(e) => setQuickAdd(e.target.value)}
                  disabled={quickAdding}
                />
                <button className="btn btn-secondary" type="submit" disabled={quickAdding}>
                  <IconPlus className="i" stroke={1.75} /> Add
                </button>
              </form>
            )}
            {schedule.length === 0 ? (
              <div className="empty">
                <b>Nothing scheduled today</b>
                <span>Use quick add above, or plan the day from the button at the top.</span>
              </div>
            ) : (
              <ol className="tl">
                {rows.map(({ item, overlap, showNow }) => (
                  <React.Fragment key={item.id}>
                    {showNow && (
                      <li className="now" aria-label="Current time">
                        <span>{`${String(Math.floor(nowMin / 60)).padStart(2, "0")}:${String(nowMin % 60).padStart(2, "0")}`}</span>
                      </li>
                    )}
                    <li className={`tl-item ${item.done ? "done" : ""}`}>
                      <button
                        className="cb-hit"
                        role="checkbox"
                        aria-checked={item.done}
                        aria-label={`${item.done ? "Reopen" : "Complete"}: ${item.title}`}
                        onClick={() => toggleDone(item)}
                      >
                        <span className="cb" aria-hidden="true">
                          <IconCheck className="i sm" stroke={2} />
                        </span>
                      </button>
                      <div className="tl-time num">
                        {item.time}
                        <small>{durLabel(item.durationMinutes)}</small>
                      </div>
                      <i className={`tl-bar ${item.kind === "CLIENT_WORK" ? "client" : item.kind.toLowerCase()}`} aria-hidden="true"></i>
                      <button className="tl-main" onClick={() => setDialog({ date: todayKey(), editId: item.id })}>
                        <b>{item.title}</b>
                        <span>{item.contact ? `${item.contact.firstName} ${item.contact.lastName ?? ""}`.trim() : "Click & Co (internal)"}</span>
                        {item.notes && <em>{item.notes}</em>}
                      </button>
                      <div className="tl-flags">{overlap && <span className="pill warn">Overlaps</span>}</div>
                    </li>
                  </React.Fragment>
                ))}
                {tailNow && (
                  <li className="now" aria-label="Current time">
                    <span>{`${String(Math.floor(nowMin / 60)).padStart(2, "0")}:${String(nowMin % 60).padStart(2, "0")}`}</span>
                  </li>
                )}
              </ol>
            )}
          </section>

          <section className="panel" aria-labelledby="ac-h">
            <div className="panel-head">
              <h2 id="ac-h">Recent activity</h2>
            </div>
            <ul className="queue">
              {activity.map((a) => (
                <li className="q-item" style={{ gridTemplateColumns: "minmax(0,1fr)" }} key={a.id}>
                  <div>
                    <b style={{ fontWeight: 500 }}>
                      {a.actorName} {describeAuditAction(a.action)}
                    </b>
                    <span>{ago(a.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="stack">
          <section className="panel" aria-labelledby="ny-h">
            <div className="panel-head">
              <div>
                <h2 id="ny-h">Needs you</h2>
                <p>{needsYou.length ? `${needsYou.length} to deal with` : "All clear"}</p>
              </div>
            </div>
            {needsYou.length ? (
              <ul className="queue">
                {needsYou.slice(0, 6).map((n) => {
                  const Icon = NEEDS_ICON[n.icon];
                  return (
                    <li className="q-item" key={n.id}>
                      <span className={`q-ic ${n.tone}`}>
                        <Icon className="i" stroke={1.75} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <b>{n.title}</b>
                        <span>{n.sub}</span>
                      </div>
                      {n.toggleCalendarEventId ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => dismissMissed(n.toggleCalendarEventId!)}>
                          {n.label}
                        </button>
                      ) : (
                        <Link className="btn btn-secondary btn-sm" href={n.href ?? "#"}>
                          {n.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty">
                <b>You are up to date</b>
                <span>Late invoices, quotes to chase and client holdups show up here.</span>
              </div>
            )}
          </section>

          {canViewProjects && (
            <section className="panel" aria-labelledby="dl-h">
              <div className="panel-head">
                <h2 id="dl-h">Active delivery</h2>
                <Link className="link-btn" href="/portal/projects">
                  All projects <IconArrowRight className="i sm" stroke={1.75} />
                </Link>
              </div>
              <ul className="queue">
                {activeDelivery.map((p) => (
                  <li className="q-item" style={{ gridTemplateColumns: "minmax(0,1fr) 92px" }} key={p.id}>
                    <Link className="row-open" href={`/portal/projects?open=${p.id}`}>
                      <b className="ellip">{p.contactName}</b>
                      <span className="ellip" style={{ display: "block" }}>
                        {p.name} · due {dShort(p.dueDate)}
                      </span>
                    </Link>
                    <div>
                      <div className="progress cy" aria-hidden="true">
                        <i style={{ width: `${p.progress}%` }}></i>
                      </div>
                      <span className="num" style={{ fontSize: 12.5 }}>
                        {p.progress}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {dialog && (
        <EventDialog
          key={dialog.editId ?? dialog.date}
          date={dialog.date}
          editEventId={dialog.editId}
          contacts={contacts}
          canDelete={canEditCalendar}
          onClose={() => setDialog(null)}
          onSaved={upsertSchedule}
          onDeleted={removeSchedule}
        />
      )}
    </>
  );
}

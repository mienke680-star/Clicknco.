"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconPlus, IconArrowRight, IconCircleCheck, IconClock } from "@tabler/icons-react";
import { dShort, relDay, initials, avatarClass } from "@/lib/clickco/format";
import { DESIGN_STATUS_LABEL, DESIGN_STATUS_TONE, HEALTH_LABEL, HEALTH_TONE, nextDesignStatus } from "@/lib/clickco/consulting-calc";
import { apiPost } from "@/lib/api-client";
import { useHubToast } from "@/components/hub/toast";
import { ConsultDetailDialog } from "./consult-detail-dialog";
import { NewRetainerDialog } from "./new-retainer-dialog";
import { NewDesignDialog } from "./new-design-dialog";
import type { RecurringServiceDTO, DesignBriefDTO } from "@/lib/clickco/consulting";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

export function ConsultingClient({
  services: initialServices,
  briefs: initialBriefs,
  contacts,
  canCreate,
  canEdit,
}: {
  services: RecurringServiceDTO[];
  briefs: DesignBriefDTO[];
  contacts: ContactOption[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useHubToast();
  const [services, setServices] = React.useState(initialServices);
  const [briefs, setBriefs] = React.useState(initialBriefs);
  const [newRetainerOpen, setNewRetainerOpen] = React.useState(false);
  const [newDesignOpen, setNewDesignOpen] = React.useState(false);
  const [busyBriefId, setBusyBriefId] = React.useState<string | null>(null);

  const openContactId = searchParams.get("open");
  const openService = services.find((s) => s.contactId === openContactId);

  function setOpenContactId(id: string | null) {
    router.push(id ? `${pathname}?open=${id}` : pathname);
  }

  function upsertService(service: RecurringServiceDTO) {
    setServices((prev) => (prev.some((s) => s.id === service.id) ? prev.map((s) => (s.id === service.id ? service : s)) : [service, ...prev]));
  }

  async function advanceBrief(brief: DesignBriefDTO) {
    setBusyBriefId(brief.id);
    try {
      const result = await apiPost<{ brief: DesignBriefDTO }>(`/api/design-briefs/${brief.id}/advance`);
      setBriefs((prev) => prev.map((b) => (b.id === brief.id ? result.brief : b)));
    } catch {
      toast.show("Couldn't move the design brief", "error");
    } finally {
      setBusyBriefId(null);
    }
  }

  const nextReview = [...services].sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())[0];
  const usedTotal = services.reduce((s, c) => s + c.usedDesigns, 0);
  const quotaTotal = services.reduce((s, c) => s + c.designQuota, 0);
  const approvals = briefs.filter((d) => d.status === "APPROVAL").length;
  const activeQueue = briefs.filter((d) => d.status !== "DELIVERED");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Advisory workspace</p>
          <h1 tabIndex={-1}>Social consulting</h1>
          <p>Platform reviews, consulting sessions and reusable design packs for agents.</p>
        </div>
        <div className="actions">
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setNewDesignOpen(true)}>
              <IconPlus className="i" stroke={1.75} /> New design brief
            </button>
          )}
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <small>Retainer clients</small>
          <b className="num">{services.length}</b>
          <em>With a review cadence</em>
        </div>
        <div className="stat">
          <small>Next review</small>
          <b className="num">{nextReview ? dShort(nextReview.nextReviewAt) : "-"}</b>
          <em>{nextReview ? `${nextReview.contact.firstName} ${nextReview.contact.lastName ?? ""}, ${relDay(nextReview.nextReviewAt)}` : ""}</em>
        </div>
        <div className="stat">
          <small>Designs used</small>
          <b className="num">
            {usedTotal} / {quotaTotal}
          </b>
          <em>Across all retainers</em>
        </div>
        <div className="stat">
          <small>Awaiting approval</small>
          <b className="num">{approvals}</b>
          <em className={approvals ? "bad" : "good"}>{approvals ? "Chase the client" : "Nothing waiting"}</em>
        </div>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Client workspaces</h2>
              <p>Select a client to log a review</p>
            </div>
            {canCreate && (
              <button className="btn btn-secondary btn-sm" onClick={() => setNewRetainerOpen(true)}>
                <IconPlus className="i sm" stroke={1.75} /> New retainer
              </button>
            )}
          </div>
          {services.length === 0 ? (
            <div className="empty">
              <b>No retainers yet</b>
              <span>Add a client onto a review cadence.</span>
            </div>
          ) : (
            services.map((s) => {
              const name = `${s.contact.firstName} ${s.contact.lastName ?? ""}`.trim();
              return (
                <div className="cons-row" key={s.id}>
                  <span className={`mini-av ${avatarClass(s.contactId)}`}>{initials(name)}</span>
                  <button className="row-open" onClick={() => setOpenContactId(s.contactId)}>
                    <b>{name}</b>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: 13.5 }}>
                      {s.platforms} · {s.cadenceLabel}
                    </small>
                    <span style={{ display: "block", fontSize: 14, color: "var(--ink-2)" }}>{s.focus}</span>
                  </button>
                  <div>
                    <small style={{ color: "var(--muted)", fontSize: 13 }}>Designs</small>
                    <div className="num" style={{ fontWeight: 600 }}>
                      {s.usedDesigns} / {s.designQuota}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: "var(--muted)", fontSize: 13 }}>Next review</small>
                    <div className="num" style={{ fontWeight: 600 }}>
                      {dShort(s.nextReviewAt)}
                    </div>
                  </div>
                  <span className={`pill ${HEALTH_TONE[s.health]}`}>{HEALTH_LABEL[s.health]}</span>
                </div>
              );
            })
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Agent design queue</h2>
              <p>Move each item along as it progresses</p>
            </div>
          </div>
          {activeQueue.length === 0 ? (
            <div className="empty">
              <b>Queue is empty</b>
              <span>Add a brief to start the next pack.</span>
            </div>
          ) : (
            activeQueue.map((d) => {
              const name = `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim();
              const nextLabel = DESIGN_STATUS_LABEL[nextDesignStatus(d.status)];
              return (
                <div className="dq" key={d.id}>
                  <div style={{ minWidth: 0 }}>
                    <b>{d.title}</b>
                    <small>
                      {name} · {d.detail}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`pill ${DESIGN_STATUS_TONE[d.status]}`}>{DESIGN_STATUS_LABEL[d.status]}</span>
                    {canEdit && (
                      <button className="icon-btn sm" disabled={busyBriefId === d.id} onClick={() => advanceBrief(d)} aria-label={`Move ${d.title} to ${nextLabel}`}>
                        <IconArrowRight className="i sm" stroke={1.75} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div className="checklist">
            <b>Every consulting retainer includes</b>
            <span>
              <IconCircleCheck className="i sm" stroke={1.75} /> Platform audit
            </span>
            <span>
              <IconCircleCheck className="i sm" stroke={1.75} /> Written action plan
            </span>
            <span>
              <IconCircleCheck className="i sm" stroke={1.75} /> Agent-ready templates
            </span>
            <span>
              <IconClock className="i sm" stroke={1.75} /> Monthly performance notes
            </span>
          </div>
        </section>
      </div>

      {newRetainerOpen && (
        <NewRetainerDialog
          onClose={() => setNewRetainerOpen(false)}
          contacts={contacts}
          onSaved={(service) => {
            upsertService(service);
            setNewRetainerOpen(false);
            setOpenContactId(service.contactId);
          }}
        />
      )}

      {newDesignOpen && (
        <NewDesignDialog
          onClose={() => setNewDesignOpen(false)}
          contacts={contacts}
          onSaved={(brief) => {
            setBriefs((prev) => [...prev, brief]);
            setNewDesignOpen(false);
          }}
        />
      )}

      {openService && <ConsultDetailDialog key={openService.id} service={openService} canEdit={canEdit} onClose={() => setOpenContactId(null)} onChanged={upsertService} />}
    </>
  );
}

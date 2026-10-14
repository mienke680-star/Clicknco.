"use client";

import * as React from "react";
import { IconPlus, IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPatch, apiPost } from "@/lib/api-client";
import { dShort } from "@/lib/clickco/format";
import { CONSULTING_HEALTHS } from "@/lib/validation/clickco";
import { HEALTH_LABEL } from "@/lib/clickco/consulting-calc";
import type { RecurringServiceDTO } from "@/lib/clickco/consulting";
import type { ConsultingHealth } from "@/generated/prisma/client";

export interface ConsultDetailDialogProps {
  onClose: () => void;
  service: RecurringServiceDTO;
  canEdit: boolean;
  onChanged: (service: RecurringServiceDTO) => void;
}

export function ConsultDetailDialog({ onClose, service, canEdit, onChanged }: ConsultDetailDialogProps) {
  const toast = useHubToast();
  const [busy, setBusy] = React.useState(false);
  const name = `${service.contact.firstName} ${service.contact.lastName ?? ""}`.trim();
  const progress = Math.round((service.usedDesigns / service.designQuota) * 100);

  async function setHealth(health: ConsultingHealth) {
    setBusy(true);
    try {
      const result = await apiPatch<{ service: RecurringServiceDTO }>(`/api/consulting/${service.contactId}`, { health });
      onChanged(result.service);
    } catch {
      toast.show("Couldn't update health", "error");
    } finally {
      setBusy(false);
    }
  }

  async function logDesign() {
    setBusy(true);
    try {
      const result = await apiPost<{ service: RecurringServiceDTO }>(`/api/consulting/${service.contactId}/log-design`);
      onChanged(result.service);
    } catch {
      toast.show("Couldn't log the design", "error");
    } finally {
      setBusy(false);
    }
  }

  async function logReview() {
    setBusy(true);
    try {
      const result = await apiPost<{ service: RecurringServiceDTO }>(`/api/consulting/${service.contactId}/log-review`);
      toast.show(`Next review booked for ${dShort(result.service.nextReviewAt)}`);
      onChanged(result.service);
      onClose();
    } catch {
      toast.show("Couldn't log the review", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <div className="dlg-head">
        <div>
          <small>Social consulting</small>
          <h2>{name}</h2>
        </div>
      </div>
      <div className="dlg-body">
        <p>{service.focus}</p>
        <div className="grid-3">
          <div className="stat" style={{ border: "1px solid var(--line)", borderRadius: "var(--r)" }}>
            <small>Platforms</small>
            <b style={{ font: "600 15px var(--font)" }}>{service.platforms}</b>
          </div>
          <div className="stat" style={{ border: "1px solid var(--line)", borderRadius: "var(--r)" }}>
            <small>Cadence</small>
            <b style={{ font: "600 15px var(--font)" }}>{service.cadenceLabel}</b>
          </div>
          <div className="stat" style={{ border: "1px solid var(--line)", borderRadius: "var(--r)" }}>
            <small>Next review</small>
            <b style={{ font: "600 15px var(--font)" }}>{dShort(service.nextReviewAt)}</b>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>Designs delivered</b>
            <span className="num">
              {service.usedDesigns} / {service.designQuota}
            </span>
          </div>
          <div className="progress" style={{ marginTop: 8 }}>
            <i style={{ width: `${progress}%` }}></i>
          </div>
        </div>
        <label className="field">
          <span>Health</span>
          <select className="input" value={service.health} disabled={!canEdit || busy} onChange={(e) => setHealth(e.target.value as ConsultingHealth)}>
            {CONSULTING_HEALTHS.map((h) => (
              <option key={h} value={h}>
                {HEALTH_LABEL[h]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="dlg-foot">
        {canEdit ? (
          <button className="btn btn-secondary" disabled={busy || service.usedDesigns >= service.designQuota} onClick={logDesign}>
            <IconPlus className="i sm" stroke={1.75} /> Log a delivered design
          </button>
        ) : (
          <span></span>
        )}
        <div className="r">
          {canEdit && (
            <button className="btn btn-primary" disabled={busy} onClick={logReview}>
              <IconCheck className="i sm" stroke={1.75} /> Review done, book next
            </button>
          )}
        </div>
      </div>
    </HubDialog>
  );
}

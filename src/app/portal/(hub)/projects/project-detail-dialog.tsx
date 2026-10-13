"use client";

import * as React from "react";
import Link from "next/link";
import { IconUsers } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPatch } from "@/lib/api-client";
import { projectProgress } from "@/lib/clickco/milestones";
import type { ProjectDTO } from "@/lib/clickco/projects";
import type { ProjectStage } from "@/generated/prisma/client";

const STAGES: { key: ProjectStage; label: string }[] = [
  { key: "ONBOARDING", label: "Onboarding" },
  { key: "IN_PRODUCTION", label: "In production" },
  { key: "CLIENT_REVIEW", label: "Client review" },
  { key: "WAITING_FOR_CLIENT", label: "Waiting for client" },
  { key: "LAUNCHED", label: "Launched" },
];

export interface ProjectDetailDialogProps {
  onClose: () => void;
  project: ProjectDTO;
  canEdit: boolean;
  onChanged: (project: ProjectDTO) => void;
}

export function ProjectDetailDialog({ onClose, project, canEdit, onChanged }: ProjectDetailDialogProps) {
  const toast = useHubToast();
  // Seeded once per project (this dialog is remounted via a `key={project.id}`
  // in the parent whenever a different project opens) and otherwise only
  // ever changed by this dialog's own saves -- no effect needed to resync.
  const [dueDate, setDueDate] = React.useState(new Date(project.dueDate).toISOString().slice(0, 10));
  const [waitingNote, setWaitingNote] = React.useState(project.waitingNote ?? "");
  const [busy, setBusy] = React.useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const result = await apiPatch<{ project: ProjectDTO }>(`/api/projects/${project.id}`, body);
      onChanged(result.project);
    } catch {
      toast.show("Couldn't update the project", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMilestone(milestoneId: string, done: boolean) {
    setBusy(true);
    try {
      const result = await apiPatch<{ project: ProjectDTO }>(`/api/projects/${project.id}/milestones/${milestoneId}`, { done });
      onChanged(result.project);
    } catch {
      toast.show("Couldn't update the milestone", "error");
    } finally {
      setBusy(false);
    }
  }

  const contactName = `${project.contact.firstName} ${project.contact.lastName ?? ""}`.trim();
  const progress = projectProgress(project.milestones);

  return (
    <HubDialog open onClose={onClose}>
      <div className="dlg-head">
        <div>
          <small>{contactName}</small>
          <h2>{project.name}</h2>
        </div>
      </div>
      <div className="dlg-body">
        <div className="grid-2">
          <label className="field">
            <span>Stage</span>
            <select className="input" value={project.stage} disabled={!canEdit || busy} onChange={(e) => patch({ stage: e.target.value })}>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              className="input"
              type="date"
              value={dueDate}
              disabled={!canEdit || busy}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => dueDate && patch({ dueDate })}
            />
          </label>
        </div>
        <label className="field">
          <span>Waiting on the client for</span>
          <input
            className="input"
            placeholder="Only when the stage is Waiting for client"
            value={waitingNote}
            disabled={!canEdit || busy}
            onChange={(e) => setWaitingNote(e.target.value)}
            onBlur={() => patch({ waitingNote })}
          />
        </label>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Milestones</b>
            <span className="num" style={{ color: "var(--muted)" }}>
              {progress}% complete
            </span>
          </div>
          <div className="progress cy" style={{ margin: "8px 0" }}>
            <i style={{ width: `${progress}%` }}></i>
          </div>
          {project.milestones.map((m) => (
            <label className="check-row" key={m.id}>
              <input type="checkbox" checked={m.done} disabled={!canEdit || busy} onChange={(e) => toggleMilestone(m.id, e.target.checked)} />
              <span style={m.done ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>{m.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="dlg-foot">
        <Link className="btn btn-secondary" href={`/portal/contacts?open=${project.contactId}`}>
          <IconUsers className="i sm" stroke={1.75} /> Client record
        </Link>
        <div className="r">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </HubDialog>
  );
}

"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconPlus, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useHubToast } from "@/components/hub/toast";
import { apiPatch } from "@/lib/api-client";
import { dShort } from "@/lib/clickco/format";
import { projectProgress } from "@/lib/clickco/milestones";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectDetailDialog } from "./project-detail-dialog";
import type { ProjectDTO } from "@/lib/clickco/projects";
import type { PackageDTO } from "@/lib/clickco/packages";
import type { ProjectStage } from "@/generated/prisma/client";

const STAGES: { key: ProjectStage; label: string }[] = [
  { key: "ONBOARDING", label: "Onboarding" },
  { key: "IN_PRODUCTION", label: "In production" },
  { key: "CLIENT_REVIEW", label: "Client review" },
  { key: "WAITING_FOR_CLIENT", label: "Waiting for client" },
  { key: "LAUNCHED", label: "Launched" },
];

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export function ProjectsClient({
  projects: initialProjects,
  packages,
  contacts,
  canCreate,
  canEdit,
}: {
  projects: ProjectDTO[];
  packages: PackageDTO[];
  contacts: ContactOption[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useHubToast();
  const [projects, setProjects] = React.useState(initialProjects);
  const [newOpen, setNewOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Mirrors the Quotes screen's ?open=<id> pattern -- deep-linkable from Ctrl+K
  // and from the client-record "Work" list, no reset-on-open effect needed.
  const openProjectId = searchParams.get("open");
  const openProject = projects.find((p) => p.id === openProjectId);

  function setOpenProjectId(id: string | null) {
    router.push(id ? `${pathname}?open=${id}` : pathname);
  }

  function upsertProject(project: ProjectDTO) {
    setProjects((prev) => (prev.some((p) => p.id === project.id) ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev]));
  }

  async function move(project: ProjectDTO, dir: 1 | -1) {
    const i = STAGES.findIndex((s) => s.key === project.stage);
    const next = STAGES[i + dir];
    if (!next) return;
    setBusyId(project.id);
    try {
      const result = await apiPatch<{ project: ProjectDTO }>(`/api/projects/${project.id}`, { stage: next.key });
      upsertProject(result.project);
      if (next.key === "LAUNCHED") toast.show(`${result.project.name} launched`);
    } catch {
      toast.show("Couldn't move the project", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Delivery</p>
          <h1 tabIndex={-1}>Projects</h1>
          <p>Every accepted quote moves through one clear workflow. Use the arrows to move a project on.</p>
        </div>
        {canCreate && (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
              <IconPlus className="i" stroke={1.75} /> New project
            </button>
          </div>
        )}
      </div>

      <div className="kanban">
        {STAGES.map((stage, colIndex) => {
          const items = [...projects].filter((p) => p.stage === stage.key).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          return (
            <section className="col" aria-label={stage.label} key={stage.key}>
              <header>
                <span>{stage.label}</span>
                <b>{items.length}</b>
              </header>
              {items.length === 0 ? (
                <p style={{ color: "var(--muted)", padding: "6px 4px", fontSize: 14 }}>Nothing here.</p>
              ) : (
                items.map((p) => {
                  const next = p.milestones.find((m) => !m.done);
                  const progress = projectProgress(p.milestones);
                  const contactName = `${p.contact.firstName} ${p.contact.lastName ?? ""}`.trim();
                  return (
                    <article className="card" key={p.id}>
                      <small>{contactName}</small>
                      <h3>
                        <button className="row-open" onClick={() => setOpenProjectId(p.id)}>
                          {p.name}
                        </button>
                      </h3>
                      <small>{stage.key === "LAUNCHED" ? "All milestones done" : next ? `Next: ${next.label}` : "Ready to launch"}</small>
                      {stage.key === "WAITING_FOR_CLIENT" && p.waitingNote && <small style={{ color: "var(--warn)" }}>Waiting for: {p.waitingNote}</small>}
                      <div className="prog">
                        <div className="progress cy" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                          <i style={{ width: `${progress}%` }}></i>
                        </div>
                        {progress}%
                      </div>
                      <div className="foot">
                        <span>{stage.key === "LAUNCHED" ? "Launched" : `Due ${dShort(p.dueDate)}`}</span>
                        {canEdit && (
                          <span>
                            <button
                              className="icon-btn sm"
                              disabled={colIndex === 0 || busyId === p.id}
                              onClick={() => move(p, -1)}
                              aria-label={`Move ${p.name} back`}
                            >
                              <IconChevronLeft className="i sm" stroke={1.75} />
                            </button>
                            <button
                              className="icon-btn sm"
                              disabled={colIndex === STAGES.length - 1 || busyId === p.id}
                              onClick={() => move(p, 1)}
                              aria-label={`Move ${p.name} forward`}
                            >
                              <IconChevronRight className="i sm" stroke={1.75} />
                            </button>
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          );
        })}
      </div>

      {newOpen && (
        <NewProjectDialog
          onClose={() => setNewOpen(false)}
          contacts={contacts}
          packages={packages}
          onSaved={(project) => {
            upsertProject(project);
            setNewOpen(false);
            setOpenProjectId(project.id);
          }}
        />
      )}

      {openProject && <ProjectDetailDialog key={openProject.id} onClose={() => setOpenProjectId(null)} project={openProject} canEdit={canEdit} onChanged={upsertProject} />}
    </>
  );
}

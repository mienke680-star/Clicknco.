"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost } from "@/lib/api-client";
import type { ProjectDTO } from "@/lib/clickco/projects";
import type { PackageDTO } from "@/lib/clickco/packages";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 28);
  return d.toISOString().slice(0, 10);
}

export interface NewProjectDialogProps {
  onClose: () => void;
  contacts: ContactOption[];
  packages: PackageDTO[];
  onSaved: (project: ProjectDTO) => void;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function NewProjectDialog({ onClose, contacts, packages, onSaved }: NewProjectDialogProps) {
  const toast = useHubToast();
  const [contactId, setContactId] = React.useState(contacts[0]?.id ?? "");
  const [packageId, setPackageId] = React.useState(packages[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [dueDate, setDueDate] = React.useState(defaultDueDate());
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !packageId || !dueDate) {
      toast.show("Fill in the client, package and due date", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ project: ProjectDTO }>("/api/projects", { contactId, packageId, name, dueDate });
      toast.show(`Project started for ${result.project.contact.firstName}`);
      onSaved(result.project);
    } catch {
      toast.show("Couldn't create the project", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>Start a delivery project</small>
            <h2>New project</h2>
          </div>
        </div>
        <div className="dlg-body">
          <label className="field">
            <span>Client</span>
            <select className="input" value={contactId} onChange={(e) => setContactId(e.target.value)} autoFocus>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName ?? ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Package</span>
            <select className="input" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Project name</span>
              <input className="input" placeholder="Defaults to the package name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Due date</span>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </label>
          </div>
        </div>
        <div className="dlg-foot">
          <span></span>
          <div className="r">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IconCheck className="i sm" stroke={1.75} /> Create project
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

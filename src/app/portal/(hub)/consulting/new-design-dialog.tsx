"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost } from "@/lib/api-client";
import type { DesignBriefDTO } from "@/lib/clickco/consulting";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface NewDesignDialogProps {
  onClose: () => void;
  contacts: ContactOption[];
  onSaved: (brief: DesignBriefDTO) => void;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function NewDesignDialog({ onClose, contacts, onSaved }: NewDesignDialogProps) {
  const toast = useHubToast();
  const [contactId, setContactId] = React.useState(contacts[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !title.trim()) {
      toast.show("Select a client and what needs designing", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ brief: DesignBriefDTO }>("/api/design-briefs", { contactId, title: title.trim(), detail: detail.trim() });
      toast.show("Design brief added");
      onSaved(result.brief);
    } catch {
      toast.show("Couldn't add the brief", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>Add to the queue</small>
            <h2>New design brief</h2>
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
            <span>What needs designing</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="field">
            <span>Detail or due date</span>
            <input className="input" placeholder="For example: 4 formats, due Friday" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </label>
        </div>
        <div className="dlg-foot">
          <span></span>
          <div className="r">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IconCheck className="i sm" stroke={1.75} /> Add brief
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

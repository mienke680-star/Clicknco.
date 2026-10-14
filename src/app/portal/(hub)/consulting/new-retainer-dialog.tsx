"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost } from "@/lib/api-client";
import type { RecurringServiceDTO } from "@/lib/clickco/consulting";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface NewRetainerDialogProps {
  onClose: () => void;
  contacts: ContactOption[];
  onSaved: (service: RecurringServiceDTO) => void;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function NewRetainerDialog({ onClose, contacts, onSaved }: NewRetainerDialogProps) {
  const toast = useHubToast();
  const [contactId, setContactId] = React.useState(contacts[0]?.id ?? "");
  const [platforms, setPlatforms] = React.useState("");
  const [cadenceLabel, setCadenceLabel] = React.useState("Monthly");
  const [every, setEvery] = React.useState(30);
  const [designQuota, setDesignQuota] = React.useState(8);
  const [focus, setFocus] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !platforms.trim()) {
      toast.show("Select a client and the platforms covered", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ service: RecurringServiceDTO }>("/api/consulting", {
        contactId,
        platforms: platforms.trim(),
        cadenceLabel: cadenceLabel.trim(),
        every,
        designQuota,
        focus: focus.trim(),
      });
      toast.show("Retainer started");
      onSaved(result.service);
    } catch {
      toast.show("Couldn't start the retainer", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>Social consulting</small>
            <h2>New retainer</h2>
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
            <span>Platforms</span>
            <input className="input" placeholder="e.g. Instagram + Facebook" value={platforms} onChange={(e) => setPlatforms(e.target.value)} required />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Cadence label</span>
              <input className="input" placeholder="e.g. Fortnightly" value={cadenceLabel} onChange={(e) => setCadenceLabel(e.target.value)} required />
            </label>
            <label className="field">
              <span>Review every (days)</span>
              <input className="input" type="number" min={1} max={365} value={every} onChange={(e) => setEvery(Number(e.target.value) || 1)} required />
            </label>
          </div>
          <label className="field">
            <span>Design quota per cycle</span>
            <input className="input" type="number" min={1} max={999} value={designQuota} onChange={(e) => setDesignQuota(Number(e.target.value) || 1)} required />
          </label>
          <label className="field">
            <span>Focus</span>
            <textarea className="input" rows={2} placeholder="What this retainer is working toward" value={focus} onChange={(e) => setFocus(e.target.value)} />
          </label>
        </div>
        <div className="dlg-foot">
          <span></span>
          <div className="r">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IconCheck className="i sm" stroke={1.75} /> Start retainer
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

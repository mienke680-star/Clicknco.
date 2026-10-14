"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost, apiPatch } from "@/lib/api-client";
import type { AddonDTO } from "@/lib/clickco/packages";

export interface AddonDialogProps {
  onClose: () => void;
  existing?: AddonDTO | null;
  onSaved: (addon: AddonDTO) => void;
}

export function AddonDialog({ onClose, existing, onSaved }: AddonDialogProps) {
  const toast = useHubToast();
  const [name, setName] = React.useState(existing?.name ?? "");
  const [price, setPrice] = React.useState(existing ? String(existing.price) : "");
  const [billing, setBilling] = React.useState<"ONCE_OFF" | "MONTHLY">(existing?.billing ?? "ONCE_OFF");
  const [customQuote, setCustomQuote] = React.useState(existing?.customQuote ?? false);
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.show("Give it a name", "error");
      return;
    }
    if (!customQuote && (!price.trim() || Number.isNaN(Number(price)))) {
      toast.show("Add a price, or mark it as quoted", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), price: customQuote ? 0 : Number(price), billing, customQuote };
      const result = existing
        ? await apiPatch<{ addon: AddonDTO }>(`/api/addons/${existing.id}`, payload)
        : await apiPost<{ addon: AddonDTO }>("/api/addons", payload);
      toast.show(existing ? "Add-on updated" : "Add-on added");
      onSaved(result.addon);
    } catch {
      toast.show("Couldn't save the add-on", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>Add-ons</small>
            <h2>{existing ? "Edit add-on" : "Add add-on"}</h2>
          </div>
        </div>
        <div className="dlg-body">
          <label className="field">
            <span>Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </label>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={customQuote} onChange={(e) => setCustomQuote(e.target.checked)} />
            <span>Quoted (no fixed price)</span>
          </label>
          {!customQuote && (
            <div className="grid-2">
              <label className="field">
                <span>Price (R)</span>
                <input className="input" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </label>
              <label className="field">
                <span>Billing</span>
                <select className="input" value={billing} onChange={(e) => setBilling(e.target.value as "ONCE_OFF" | "MONTHLY")}>
                  <option value="ONCE_OFF">Once-off</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <div className="dlg-foot">
          <span></span>
          <div className="r">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IconCheck className="i sm" stroke={1.75} /> {existing ? "Save changes" : "Add add-on"}
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

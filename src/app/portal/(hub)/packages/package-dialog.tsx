"use client";

import * as React from "react";
import { IconCheck, IconTrash } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost, apiPatch } from "@/lib/api-client";
import type { PackageDTO } from "@/lib/clickco/packages";

const CATEGORIES = [
  "Website Development",
  "Website Maintenance",
  "Branding & Corporate Identity",
  "Graphic Design",
  "Digital Marketing",
  "Social Media Consulting",
  "Digital Consulting",
  "CV & Document Design",
  "Custom Services",
];

function linesToList(v: string) {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface PackageDialogProps {
  onClose: () => void;
  existing?: PackageDTO | null;
  onSaved: (pkg: PackageDTO) => void;
}

export function PackageDialog({ onClose, existing, onSaved }: PackageDialogProps) {
  const toast = useHubToast();
  const [category, setCategory] = React.useState(existing?.category ?? CATEGORIES[0]!);
  const [name, setName] = React.useState(existing?.name ?? "");
  const [strapline, setStrapline] = React.useState(existing?.strapline ?? "");
  const [price, setPrice] = React.useState(existing ? String(existing.price) : "");
  const [billing, setBilling] = React.useState<"ONCE_OFF" | "MONTHLY">(existing?.billing ?? "ONCE_OFF");
  const [customQuote, setCustomQuote] = React.useState(existing?.customQuote ?? false);
  const [deposit, setDeposit] = React.useState(existing?.deposit != null ? String(existing.deposit) : "");
  const [instalment, setInstalment] = React.useState(existing?.instalment != null ? String(existing.instalment) : "");
  const [instalmentMonths, setInstalmentMonths] = React.useState(existing?.instalmentMonths != null ? String(existing.instalmentMonths) : "6");
  const [onboarding, setOnboarding] = React.useState(existing?.onboarding != null ? String(existing.onboarding) : "");
  const [minimumMonths, setMinimumMonths] = React.useState(existing?.minimumMonths != null ? String(existing.minimumMonths) : "3");
  const [featured, setFeatured] = React.useState(existing?.featured ?? false);
  const [features, setFeatures] = React.useState(existing?.features.join("\n") ?? "");
  const [turnaroundLabel, setTurnaroundLabel] = React.useState(existing?.turnaroundLabel ?? "");
  const [internalNotes, setInternalNotes] = React.useState(existing?.internalNotes ?? "");
  const [defaultTasks, setDefaultTasks] = React.useState(existing?.defaultTasks.join("\n") ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim()) {
      toast.show("Add a name and category", "error");
      return;
    }
    if (!customQuote && (!price.trim() || Number.isNaN(Number(price)))) {
      toast.show("Add a price, or mark this as a custom quote", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: category.trim(),
        name: name.trim(),
        strapline: strapline.trim(),
        price: customQuote ? 0 : Number(price),
        billing,
        customQuote,
        deposit: deposit.trim() ? Number(deposit) : null,
        instalment: instalment.trim() ? Number(instalment) : null,
        instalmentMonths: instalment.trim() && instalmentMonths.trim() ? Number(instalmentMonths) : null,
        onboarding: onboarding.trim() ? Number(onboarding) : null,
        minimumMonths: onboarding.trim() && minimumMonths.trim() ? Number(minimumMonths) : null,
        featured,
        features: linesToList(features),
        turnaroundLabel: turnaroundLabel.trim(),
        internalNotes: internalNotes.trim(),
        defaultTasks: linesToList(defaultTasks),
      };
      const result = existing
        ? await apiPatch<{ package: PackageDTO }>(`/api/packages/${existing.id}`, payload)
        : await apiPost<{ package: PackageDTO }>("/api/packages", payload);
      toast.show(existing ? "Package updated" : "Package added");
      onSaved(result.package);
    } catch {
      toast.show("Couldn't save the package", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>Services and packages</small>
            <h2>{existing ? "Edit package" : "Add package"}</h2>
          </div>
        </div>
        <div className="dlg-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="grid-2">
            <label className="field">
              <span>Category</span>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </label>
          </div>
          <label className="field">
            <span>Short description</span>
            <input className="input" value={strapline} onChange={(e) => setStrapline(e.target.value)} />
          </label>

          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={customQuote} onChange={(e) => setCustomQuote(e.target.checked)} />
            <span>Custom quotation (no fixed price -- scoped per project, like "Built Around You")</span>
          </label>

          {!customQuote && (
            <>
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

              {billing === "ONCE_OFF" ? (
                <div className="grid-2">
                  <label className="field">
                    <span>Alternative deposit (R, optional)</span>
                    <input className="input" type="number" min={0} step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>+ instalment (R/month)</span>
                    <input className="input" type="number" min={0} step="0.01" value={instalment} onChange={(e) => setInstalment(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Number of months</span>
                    <input className="input" type="number" min={1} max={60} value={instalmentMonths} onChange={(e) => setInstalmentMonths(e.target.value)} />
                  </label>
                </div>
              ) : (
                <div className="grid-2">
                  <label className="field">
                    <span>Onboarding fee (R, optional)</span>
                    <input className="input" type="number" min={0} step="0.01" value={onboarding} onChange={(e) => setOnboarding(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Minimum months</span>
                    <input className="input" type="number" min={1} max={60} value={minimumMonths} onChange={(e) => setMinimumMonths(e.target.value)} />
                  </label>
                </div>
              )}
            </>
          )}

          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            <span>Mark as "Popular" / featured</span>
          </label>

          <label className="field">
            <span>Deliverables (one per line)</span>
            <textarea className="input" rows={6} value={features} onChange={(e) => setFeatures(e.target.value)} />
          </label>

          <label className="field">
            <span>Estimated turnaround</span>
            <input className="input" placeholder="e.g. 2-3 weeks" value={turnaroundLabel} onChange={(e) => setTurnaroundLabel(e.target.value)} />
          </label>

          <label className="field">
            <span>Default project tasks (one per line -- seeded onto a project started from this package)</span>
            <textarea className="input" rows={4} value={defaultTasks} onChange={(e) => setDefaultTasks(e.target.value)} />
          </label>

          <label className="field">
            <span>Internal notes (never shown to clients)</span>
            <textarea className="input" rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
          </label>
        </div>
        <div className="dlg-foot">
          <span></span>
          <div className="r">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IconCheck className="i sm" stroke={1.75} /> {existing ? "Save changes" : "Add package"}
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

export interface ConfirmArchiveProps {
  onClose: () => void;
  name: string;
  onConfirm: () => void;
}

/** Tiny inline confirm -- a full dialog is overkill for "archive this". */
export function useConfirm() {
  const [target, setTarget] = React.useState<{ name: string; onConfirm: () => void } | null>(null);
  const node = target ? (
    <HubDialog open onClose={() => setTarget(null)}>
      <div className="dlg-head">
        <div>
          <h2>Archive "{target.name}"?</h2>
        </div>
      </div>
      <div className="dlg-body">
        <p>It'll disappear from the catalogue but stay on any quotes or invoices that already reference it.</p>
      </div>
      <div className="dlg-foot">
        <span></span>
        <div className="r">
          <button type="button" className="btn btn-ghost" onClick={() => setTarget(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              target.onConfirm();
              setTarget(null);
            }}
          >
            <IconTrash className="i sm" stroke={1.75} /> Archive
          </button>
        </div>
      </div>
    </HubDialog>
  ) : null;
  return { confirm: (name: string, onConfirm: () => void) => setTarget({ name, onConfirm }), node };
}

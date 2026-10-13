"use client";

import * as React from "react";
import { IconSend } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost, apiPatch } from "@/lib/api-client";
import { money } from "@/lib/clickco/format";
import { quoteCalc } from "@/lib/clickco/quote-calc";
import { QuoteDocumentPreview, type BusinessDetailsForDoc } from "@/components/hub/quote-document-preview";
import type { PackageDTO, AddonDTO } from "@/lib/clickco/packages";
import type { QuoteDTO } from "@/lib/clickco/quotes";
import type { QuotePlan, VatTreatment } from "@/generated/prisma/client";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

export interface QuoteBuilderDialogProps {
  onClose: () => void;
  contacts: ContactOption[];
  packages: PackageDTO[];
  addons: AddonDTO[];
  vatTreatment: VatTreatment;
  businessSettings: BusinessDetailsForDoc | null;
  nextQuoteNumber: number;
  editQuote?: QuoteDTO;
  onSaved: (quote: QuoteDTO) => void;
}

/** Mount this only while it should be open, keyed by the quote being edited
 * (or a constant for "new") -- see ComposeDialog for why: a fresh mount is
 * what resets the form, with no reset-on-open effect. */
export function QuoteBuilderDialog({ onClose, contacts, packages, addons, vatTreatment, businessSettings, nextQuoteNumber, editQuote, onSaved }: QuoteBuilderDialogProps) {
  const toast = useHubToast();
  const [contactId, setContactId] = React.useState(editQuote?.contactId ?? contacts[0]?.id ?? "");
  const [packageId, setPackageId] = React.useState(editQuote?.packageId ?? packages[0]?.id ?? "");
  const [plan, setPlan] = React.useState<QuotePlan>(editQuote?.plan ?? "ONCE");
  const [addonIds, setAddonIds] = React.useState<string[]>(
    editQuote ? addons.filter((a) => editQuote.lineItems.some((l) => l.label === a.name)).map((a) => a.id) : [],
  );
  const [notes, setNotes] = React.useState(editQuote?.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  const pkg = packages.find((p) => p.id === packageId);
  const canChoosePlan = !!pkg?.deposit && pkg.billing !== "MONTHLY";

  function selectPackage(id: string) {
    setPackageId(id);
    const next = packages.find((p) => p.id === id);
    if (!(!!next?.deposit && next.billing !== "MONTHLY")) setPlan("ONCE");
  }

  const selectedAddons = addons.filter((a) => addonIds.includes(a.id));
  const calc = pkg ? quoteCalc(pkg, plan, selectedAddons, vatTreatment) : null;
  const contact = contacts.find((c) => c.id === contactId);

  const previewNumber = editQuote?.number ?? `QUO-${new Date().getFullYear()}-${String(nextQuoteNumber).padStart(4, "0")}`;
  const previewIssuedAt = editQuote?.issuedAt ?? new Date();
  const previewValidUntil = (() => {
    const d = new Date(previewIssuedAt);
    d.setDate(d.getDate() + 14);
    return d;
  })();

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save(send: boolean) {
    if (!contactId || !packageId) {
      toast.show("Select a client and a package", "error");
      return;
    }
    setSaving(true);
    try {
      const body = { contactId, packageId, plan, addonIds, notes, send };
      const result = editQuote ? await apiPatch<{ quote: QuoteDTO }>(`/api/quotes/${editQuote.id}`, body) : await apiPost<{ quote: QuoteDTO }>("/api/quotes", body);
      toast.show(send ? "Quote saved and marked as sent" : "Draft saved");
      onSaved(result.quote);
    } catch {
      toast.show("Couldn't save the quote", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose} wide className="qb-dialog">
      <div className="qb">
        <div className="dlg-body">
          <div className="dlg-head" style={{ padding: 0, border: 0, marginBottom: 4 }}>
            <div>
              <small>{editQuote ? "Edit" : "New"}</small>
              <h2>Quote builder</h2>
            </div>
          </div>
          <label className="field">
            <span>Client</span>
            <select className="input" value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!!editQuote}>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName ?? ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Package</span>
            <select className="input" value={packageId} onChange={(e) => selectPackage(e.target.value)}>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </label>

          {pkg && (
            <div>
              {canChoosePlan ? (
                <div className="pay-opt" role="group" aria-label="Payment option">
                  <button type="button" className="opt" aria-pressed={plan === "ONCE"} onClick={() => setPlan("ONCE")}>
                    <span>
                      <b>Once-off</b>
                      <small>50% deposit, balance before launch</small>
                    </span>
                    <strong>{money(pkg.price)}</strong>
                  </button>
                  <button type="button" className="opt" aria-pressed={plan === "INSTALMENT_PLAN"} onClick={() => setPlan("INSTALMENT_PLAN")}>
                    <span>
                      <b>Six-month plan</b>
                      <small>
                        {money(pkg.deposit)} + {pkg.instalmentMonths} x {money(pkg.instalment)}
                      </small>
                    </span>
                    <strong>{money((pkg.deposit ?? 0) + (pkg.instalment ?? 0) * (pkg.instalmentMonths ?? 0))}</strong>
                  </button>
                </div>
              ) : pkg.billing === "MONTHLY" ? (
                <p className="pill info" style={{ height: "auto", padding: "8px 12px", whiteSpace: "normal" }}>
                  Billed monthly{pkg.onboarding ? `, with a ${money(pkg.onboarding)} onboarding fee on the first invoice` : ""}
                  {pkg.minimumMonths ? `. Minimum term ${pkg.minimumMonths} months.` : "."}
                </p>
              ) : null}
            </div>
          )}

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink-2)", marginBottom: 4 }}>Add-ons</legend>
            <div className="addon-pick">
              {addons.map((a) => (
                <label key={a.id}>
                  <input type="checkbox" checked={addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                  <span>{a.name}</span>
                  <b>
                    {money(a.price)}
                    {a.billing === "MONTHLY" ? "/mo" : ""}
                  </b>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>Notes for the client</span>
            <textarea className="input" rows={2} placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className="preview-wrap">
          {pkg && calc && contact ? (
            <QuoteDocumentPreview
              quote={{
                number: previewNumber,
                issuedAt: previewIssuedAt,
                validUntil: previewValidUntil,
                vatTreatment,
                subtotal: calc.subtotal,
                monthlyTotal: calc.monthlyTotal,
                vatAmount: calc.vatAmount,
                total: calc.total,
                notes,
                contact: { firstName: contact.firstName, lastName: contact.lastName, email: contact.email },
                lineItems: calc.lines.map((l, i) => ({ id: String(i), label: l.label, description: l.sub, amount: l.amount, recurring: l.recurring })),
              }}
              settings={businessSettings}
            />
          ) : (
            <div className="empty">
              <b>Pick a client and a package</b>
            </div>
          )}
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <div className="r">
          <button className="btn btn-secondary" disabled={saving} onClick={() => save(false)}>
            Save draft
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={() => save(true)}>
            <IconSend className="i sm" stroke={1.75} /> Save and mark sent
          </button>
        </div>
      </div>
    </HubDialog>
  );
}

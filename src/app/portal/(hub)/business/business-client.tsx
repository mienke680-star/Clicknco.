"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react";
import { apiPatch } from "@/lib/api-client";
import { useHubToast } from "@/components/hub/toast";
import type { BusinessSettings } from "@/generated/prisma/client";

const VAT_OPTIONS = [
  { value: "UNSET", label: "Not decided yet" },
  { value: "NONE", label: "Not VAT registered, no VAT shown" },
  { value: "EXCLUSIVE", label: "Prices exclude VAT (add 15%)" },
  { value: "INCLUSIVE", label: "Prices include VAT" },
] as const;

export function BusinessDetailsClient({ settings, canEdit }: { settings: BusinessSettings; canEdit: boolean }) {
  const router = useRouter();
  const toast = useHubToast();
  const [form, setForm] = React.useState({
    tradingName: settings.tradingName ?? "",
    ownerName: settings.ownerName ?? "",
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    registrationNumber: settings.registrationNumber ?? "",
    bankName: settings.bankName ?? "",
    accountNumber: settings.accountNumber ?? "",
    branchCode: settings.branchCode ?? "",
    vatTreatment: settings.vatTreatment,
    nextQuoteNumber: settings.nextQuoteNumber,
    nextInvoiceNumber: settings.nextInvoiceNumber,
  });
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch("/api/clickco/business-settings", form);
      toast.show("Business details saved");
      router.refresh();
    } catch {
      toast.show("Couldn't save business details", "error");
    } finally {
      setSaving(false);
    }
  }

  const todo: [boolean, string, string][] = [
    [!!form.bankName && !!form.accountNumber, "Banking details", "Bank, account number and branch code appear on invoices."],
    [form.vatTreatment !== "UNSET", "VAT treatment", "Decide whether package prices include or exclude VAT."],
    [!!form.registrationNumber, "Legal entity and registration number", "Shown in the footer of quotes and invoices."],
    [false, "Quote and invoice numbering", "Confirm the sequence below matches your records."],
    [false, "Official logo files and brand font", "Confirm the brand assets and fonts here match what you want clients to see."],
    [false, "Privacy, POPIA and service terms", "Replace the placeholder legal text before going live."],
  ];
  const doneCount = todo.filter((t) => t[0]).length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Setup</p>
          <h1 tabIndex={-1}>Business details</h1>
          <p>What appears on every quote and invoice, and what still needs confirming before you send real documents.</p>
        </div>
      </div>

      <div className="set-grid">
        <form className="panel" onSubmit={onSubmit}>
          <div className="panel-head">
            <h2>Details on documents</h2>
          </div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              <span>Trading name</span>
              <input className="input" value={form.tradingName} onChange={(e) => set("tradingName", e.target.value)} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Owner</span>
              <input className="input" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} disabled={!canEdit} />
            </label>
            <div className="grid-2">
              <label className="field">
                <span>Email</span>
                <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={!canEdit} />
              </label>
              <label className="field">
                <span>Phone</span>
                <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} disabled={!canEdit} />
              </label>
            </div>
            <label className="field">
              <span>Registration number</span>
              <input
                className="input"
                placeholder="Add when confirmed"
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
                disabled={!canEdit}
              />
            </label>
            <div className="grid-3">
              <label className="field">
                <span>Bank</span>
                <input className="input" placeholder="Bank name" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} disabled={!canEdit} />
              </label>
              <label className="field">
                <span>Account number</span>
                <input className="input" value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} disabled={!canEdit} />
              </label>
              <label className="field">
                <span>Branch code</span>
                <input className="input" value={form.branchCode} onChange={(e) => set("branchCode", e.target.value)} disabled={!canEdit} />
              </label>
            </div>
            <label className="field">
              <span>VAT on prices</span>
              <select className="input" value={form.vatTreatment} onChange={(e) => set("vatTreatment", e.target.value as typeof form.vatTreatment)} disabled={!canEdit}>
                {VAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid-2">
              <label className="field">
                <span>Next quote number</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.nextQuoteNumber}
                  onChange={(e) => set("nextQuoteNumber", Number(e.target.value) || 1)}
                  disabled={!canEdit}
                />
              </label>
              <label className="field">
                <span>Next invoice number</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.nextInvoiceNumber}
                  onChange={(e) => set("nextInvoiceNumber", Number(e.target.value) || 1)}
                  disabled={!canEdit}
                />
              </label>
            </div>
            {canEdit && (
              <div>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  <IconCheck className="i" stroke={1.75} />
                  {saving ? "Saving…" : "Save details"}
                </button>
              </div>
            )}
          </div>
        </form>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Before going live</h2>
                <p>
                  {doneCount} of {todo.length} confirmed
                </p>
              </div>
            </div>
            <ul className="todo-list">
              {todo.map(([done, title, description]) => (
                <li key={title} className={done ? "ok" : ""}>
                  {done ? <IconCircleCheck className="i" stroke={1.75} /> : <IconAlertTriangle className="i" stroke={1.75} />}
                  <div>
                    <b>{title}</b>
                    <div style={{ color: "var(--muted)", fontSize: 14 }}>{description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

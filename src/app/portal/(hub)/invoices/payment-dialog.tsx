"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost } from "@/lib/api-client";
import { money } from "@/lib/clickco/format";
import { invoiceBalance } from "@/lib/clickco/invoice-calc";
import type { InvoiceDTO } from "@/lib/clickco/invoice-calc";
import type { PaymentMethod } from "@/generated/prisma/client";

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "EFT", label: "EFT" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export interface PaymentDialogProps {
  onClose: () => void;
  invoice: InvoiceDTO;
  onSaved: (invoice: InvoiceDTO) => void;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function PaymentDialog({ onClose, invoice, onSaved }: PaymentDialogProps) {
  const toast = useHubToast();
  const balance = invoiceBalance(invoice);
  const contactName = `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();
  const [amount, setAmount] = React.useState(String(balance));
  const [paidAt, setPaidAt] = React.useState(todayKey());
  const [method, setMethod] = React.useState<PaymentMethod>("EFT");
  const [reference, setReference] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const amountNum = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const after = Math.max(0, Math.round((balance - amountNum) * 100) / 100);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!(amountNum > 0) || amountNum > balance + 0.001) {
      toast.show(amountNum > balance ? `That is more than the ${money(balance)} still owing.` : "Enter the amount received.", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ invoice: InvoiceDTO }>(`/api/invoices/${invoice.id}/payments`, { amount: amountNum, paidAt, method, reference });
      toast.show(invoiceBalance(result.invoice) <= 0 ? "Payment saved. Invoice is paid in full" : `Payment saved. ${money(invoiceBalance(result.invoice))} still owing`);
      onSaved(result.invoice);
    } catch {
      toast.show("Couldn't save the payment", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>
              {contactName} · {invoice.number}
            </small>
            <h2>Record a payment</h2>
          </div>
        </div>
        <div className="dlg-body">
          <p style={{ color: "var(--ink-2)" }}>
            Balance owing: <b className="num">{money(balance)}</b> of {money(invoice.amount)}.
          </p>
          <div className="grid-2">
            <label className="field">
              <span>Amount received</span>
              <input className="input num" type="number" step="0.01" min="0.01" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
              <small className="num">Balance after: {money(after)}</small>
            </label>
            <label className="field">
              <span>Date received</span>
              <input className="input" type="date" value={paidAt} max={todayKey()} onChange={(e) => setPaidAt(e.target.value)} required />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Method</span>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {METHOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Reference</span>
              <input className="input" placeholder="Bank reference or proof of payment" value={reference} onChange={(e) => setReference(e.target.value)} />
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
              <IconCheck className="i sm" stroke={1.75} /> Save payment
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

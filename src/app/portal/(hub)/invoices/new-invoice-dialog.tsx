"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPost } from "@/lib/api-client";
import type { InvoiceDTO } from "@/lib/clickco/invoice-calc";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export interface NewInvoiceDialogProps {
  onClose: () => void;
  contacts: ContactOption[];
  onSaved: (invoice: InvoiceDTO) => void;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function NewInvoiceDialog({ onClose, contacts, onSaved }: NewInvoiceDialogProps) {
  const toast = useHubToast();
  const [contactId, setContactId] = React.useState(contacts[0]?.id ?? "");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState(defaultDueDate());
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!contactId || !description.trim() || !(amountNum > 0) || !dueDate) {
      toast.show("Fill in the client, description, amount and due date", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ invoice: InvoiceDTO }>("/api/invoices", { contactId, description: description.trim(), amount: amountNum, dueDate });
      toast.show(`${result.invoice.number} created`);
      onSaved(result.invoice);
    } catch {
      toast.show("Couldn't create the invoice", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <form style={{ display: "contents" }} onSubmit={save}>
        <div className="dlg-head">
          <div>
            <small>Invoice a client</small>
            <h2>New invoice</h2>
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
            <span>Description</span>
            <input
              className="input"
              placeholder="For example: Website maintenance, November"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Amount</span>
              <input className="input num" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
              <IconCheck className="i sm" stroke={1.75} /> Create invoice
            </button>
          </div>
        </div>
      </form>
    </HubDialog>
  );
}

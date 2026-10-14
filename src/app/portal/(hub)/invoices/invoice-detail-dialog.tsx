"use client";

import * as React from "react";
import { IconCash, IconBell, IconDownload } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { ComposeDialog } from "@/components/hub/compose-dialog";
import { InvoiceDocumentPreview, type BankDetailsForDoc } from "@/components/hub/invoice-document-preview";
import { useHubToast } from "@/components/hub/toast";
import { apiPost } from "@/lib/api-client";
import { money, dShort, relDay } from "@/lib/clickco/format";
import { invoiceBalance, invoiceStatus } from "@/lib/clickco/invoice-calc";
import type { InvoiceDTO } from "@/lib/clickco/invoice-calc";
import { PaymentDialog } from "./payment-dialog";

const INVOICE_TONE: Record<string, string> = { Paid: "good", Overdue: "bad", "Part paid": "warn", Due: "info" };

export interface InvoiceDetailDialogProps {
  onClose: () => void;
  invoice: InvoiceDTO;
  businessSettings: BankDetailsForDoc | null;
  canEdit: boolean;
  onChanged: (invoice: InvoiceDTO) => void;
}

export function InvoiceDetailDialog({ onClose, invoice, businessSettings, canEdit, onChanged }: InvoiceDetailDialogProps) {
  const toast = useHubToast();
  const [payOpen, setPayOpen] = React.useState(false);
  const [composeOpen, setComposeOpen] = React.useState(false);

  const balance = invoiceBalance(invoice);
  const status = invoiceStatus(invoice);
  const contactName = `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();

  async function markReminded() {
    try {
      const result = await apiPost<{ invoice: InvoiceDTO }>(`/api/invoices/${invoice.id}/remind`);
      onChanged(result.invoice);
    } catch {
      toast.show("Couldn't record the reminder", "error");
    }
  }

  const lateDays = Math.round((new Date().getTime() - new Date(invoice.dueDate).getTime()) / 86400000);
  const ownerFirst = (businessSettings?.ownerName ?? "").split(" ")[0] ?? "";
  const tradingName = businessSettings?.tradingName ?? "Click & Co";
  const friendlyText = `Hi ${invoice.contact.firstName}, a friendly reminder that invoice ${invoice.number} for ${money(balance)} (${invoice.description}) ${
    lateDays > 0 ? `was due on ${dShort(invoice.dueDate)}` : `is due on ${dShort(invoice.dueDate)}`
  }. The banking details are on the invoice. Please send proof of payment once it is done.\n\nThank you,\n${ownerFirst}\n${tradingName}`;
  const firmText = `Hi ${invoice.contact.firstName}, invoice ${invoice.number} for ${money(balance)} is now ${Math.max(lateDays, 1)} days overdue. Please arrange payment today, or let me know when to expect it so your project stays on schedule.\n\nThank you,\n${ownerFirst}\n${tradingName}`;

  return (
    <>
      <HubDialog open onClose={onClose} wide>
        <div className="dlg-head">
          <div>
            <small>Invoice for {contactName}</small>
            <h2>{invoice.number}</h2>
          </div>
        </div>
        <div className="dlg-body" style={{ background: "var(--surface-2)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className={`pill ${INVOICE_TONE[status]}`}>{status}</span>
            {invoice.remindedAt && <span style={{ color: "var(--muted)", fontSize: 14 }}>Reminded {relDay(invoice.remindedAt)}</span>}
          </div>
          <InvoiceDocumentPreview invoice={invoice} settings={businessSettings} />
        </div>
        <div className="dlg-foot">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {balance > 0 && canEdit && (
              <button className="btn btn-secondary" onClick={() => setComposeOpen(true)}>
                <IconBell className="i sm" stroke={1.75} /> Send reminder
              </button>
            )}
            <a className="btn btn-secondary" href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener">
              <IconDownload className="i sm" stroke={1.75} /> Print or save PDF
            </a>
          </div>
          <div className="r">
            {balance > 0 && canEdit ? (
              <button className="btn btn-primary" onClick={() => setPayOpen(true)}>
                <IconCash className="i sm" stroke={1.75} /> Record payment
              </button>
            ) : (
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </HubDialog>

      {payOpen && (
        <PaymentDialog
          invoice={invoice}
          onClose={() => setPayOpen(false)}
          onSaved={(updated) => {
            onChanged(updated);
            setPayOpen(false);
          }}
        />
      )}

      {composeOpen && (
        <ComposeDialog
          onClose={() => setComposeOpen(false)}
          kicker={invoice.number}
          title="Payment reminder"
          to={{ name: contactName, phone: invoice.contact.phone, email: invoice.contact.email }}
          tones={{ friendly: friendlyText, firm: firmText }}
          sentLabel="Mark reminder sent"
          onSent={markReminded}
        />
      )}
    </>
  );
}

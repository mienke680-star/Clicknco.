"use client";

import * as React from "react";
import { IconCircleCheck, IconSend, IconPencil, IconBrandWhatsapp, IconDownload } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { ComposeDialog } from "@/components/hub/compose-dialog";
import { QuoteDocumentPreview } from "@/components/hub/quote-document-preview";
import { useHubToast } from "@/components/hub/toast";
import { apiPatch, apiPost } from "@/lib/api-client";
import { money, dShort } from "@/lib/clickco/format";
import type { QuoteDTO } from "@/lib/clickco/quotes";
import type { BusinessDetailsForDoc } from "@/components/hub/quote-document-preview";

const QUOTE_TONE: Record<string, string> = { DRAFT: "", SENT: "info", VIEWED: "violet", ACCEPTED: "good", DECLINED: "bad" };
const QUOTE_LABEL: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", ACCEPTED: "Accepted", DECLINED: "Declined" };

export interface QuoteDetailDialogProps {
  onClose: () => void;
  quote: QuoteDTO;
  businessSettings: BusinessDetailsForDoc | null;
  onChanged: (quote: QuoteDTO) => void;
  onEdit: () => void;
}

export function QuoteDetailDialog({ onClose, quote, businessSettings, onChanged, onEdit }: QuoteDetailDialogProps) {
  const toast = useHubToast();
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function setStatus(status: string) {
    setBusy(true);
    try {
      const result = await apiPatch<{ quote: QuoteDTO }>(`/api/quotes/${quote.id}/status`, { status });
      onChanged(result.quote);
    } catch {
      toast.show("Couldn't update the quote", "error");
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    setBusy(true);
    try {
      const result = await apiPost<{ quote: QuoteDTO }>(`/api/quotes/${quote.id}/accept`);
      onChanged(result.quote);
      toast.show("Accepted. Project started and a deposit invoice created.");
    } catch {
      toast.show("Couldn't accept the quote", "error");
    } finally {
      setBusy(false);
    }
  }

  const contactName = `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();
  const quoteTotalText = money(quote.total);
  const quoteText = `Hi ${quote.contact.firstName}, here is your Click & Co quote ${quote.number} for ${quote.package.name} (${quoteTotalText}). It is valid until ${dShort(quote.validUntil)}. Tell me if you would like to adjust anything.\n\nThank you,\n${(businessSettings?.ownerName ?? "").split(" ")[0] ?? ""}`;
  const followText = `Hi ${quote.contact.firstName}, I wanted to check in on quote ${quote.number} for ${quote.package.name}. Do you have any questions about the scope, the timeline or the payment options? Happy to jump on a quick call.\n\nThank you,\n${(businessSettings?.ownerName ?? "").split(" ")[0] ?? ""}`;

  return (
    <>
      <HubDialog open onClose={onClose} wide>
        <div className="dlg-head">
          <div>
            <small>Quote for {contactName}</small>
            <h2>{quote.number}</h2>
          </div>
        </div>
        <div className="dlg-body" style={{ background: "var(--surface-2)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`pill ${QUOTE_TONE[quote.status]}`}>{QUOTE_LABEL[quote.status]}</span>
            {quote.status === "ACCEPTED" && <span style={{ color: "var(--muted)", fontSize: 14 }}>A project and deposit invoice were created when this was accepted.</span>}
          </div>
          <QuoteDocumentPreview quote={quote} settings={businessSettings} />
        </div>
        <div className="dlg-foot">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["DRAFT", "SENT", "VIEWED"].includes(quote.status) && (
              <button className="btn btn-secondary" onClick={onEdit}>
                <IconPencil className="i sm" stroke={1.75} /> Edit
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setComposeOpen(true)}>
              <IconBrandWhatsapp className="i sm" stroke={1.75} /> Message
            </button>
            <a className="btn btn-secondary" href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noopener">
              <IconDownload className="i sm" stroke={1.75} /> Print or save PDF
            </a>
            {["SENT", "VIEWED"].includes(quote.status) && (
              <button className="btn btn-danger" disabled={busy} onClick={() => setStatus("DECLINED")}>
                Declined
              </button>
            )}
          </div>
          <div className="r">
            {quote.status === "DRAFT" && (
              <button className="btn btn-primary" disabled={busy} onClick={() => setStatus("SENT")}>
                <IconSend className="i sm" stroke={1.75} /> Mark as sent
              </button>
            )}
            {(quote.status === "SENT" || quote.status === "VIEWED") && (
              <>
                <button className="btn btn-primary" disabled={busy} onClick={accept}>
                  <IconCircleCheck className="i sm" stroke={1.75} /> Client accepted
                </button>
                {quote.status === "SENT" && (
                  <button className="btn btn-secondary" disabled={busy} onClick={() => setStatus("VIEWED")}>
                    Mark viewed
                  </button>
                )}
              </>
            )}
            {quote.status === "DECLINED" && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => setStatus("DRAFT")}>
                Reopen as draft
              </button>
            )}
          </div>
        </div>
      </HubDialog>

      {composeOpen && (
        <ComposeDialog
          onClose={() => setComposeOpen(false)}
          kicker={quote.number}
          title={`Message ${contactName}`}
          to={{ name: contactName, phone: quote.contact.phone, email: quote.contact.email }}
          tones={quote.status === "DRAFT" ? { send: quoteText } : { "follow up": followText }}
          sentLabel={quote.status === "DRAFT" ? "Mark as sent" : "Mark as followed up"}
          onSent={async () => {
            if (quote.status === "DRAFT") await setStatus("SENT");
          }}
        />
      )}
    </>
  );
}

import { money, dShort } from "@/lib/clickco/format";
import type { VatTreatment } from "@/generated/prisma/client";

export interface QuoteDocPreviewData {
  number: string;
  issuedAt: string | Date;
  validUntil: string | Date;
  vatTreatment: VatTreatment;
  subtotal: number;
  monthlyTotal: number;
  vatAmount: number;
  total: number;
  notes?: string | null;
  contact: { firstName: string; lastName?: string | null; email?: string | null };
  lineItems: { id: string; label: string; description?: string | null; amount: number; recurring: boolean }[];
}

export interface BusinessDetailsForDoc {
  ownerName?: string | null;
  tradingName?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Mirrors the spec's quoteDoc(), on screen only (dark mode never applies --
 * a quote/invoice preview is "always light paper", per the original CSS). */
export function QuoteDocumentPreview({ quote, settings }: { quote: QuoteDocPreviewData; settings: BusinessDetailsForDoc | null }) {
  return (
    <article className="doc">
      <div className="doc-top">
        <div className="doc-brand">
          <img src="/brand/logo-mark.png" alt="" width={36} height={40} />
          <div>
            <b>
              CLICK<i>&amp;co.</i>
            </b>
            <div style={{ fontSize: 12.5, color: "#52667e" }}>
              {settings?.email}
              <br />
              {settings?.phone}
            </div>
          </div>
        </div>
        <div>
          <h3>Quotation</h3>
          <div className="meta num">
            {quote.number}
            <br />
            Issued {dShort(quote.issuedAt)}
            <br />
            Valid until {dShort(quote.validUntil)}
          </div>
        </div>
      </div>

      <div className="bill">
        <div>
          <small>Prepared for</small>
          <b>
            {quote.contact.firstName} {quote.contact.lastName ?? ""}
          </b>
          <br />
          {quote.contact.email}
        </div>
        <div>
          <small>Prepared by</small>
          <b>{settings?.ownerName || "—"}</b>
          <br />
          {settings?.tradingName || "Click & Co"}
          {settings?.registrationNumber ? <br /> : null}
          {settings?.registrationNumber ? `Reg. ${settings.registrationNumber}` : null}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {quote.lineItems.map((line) => (
            <tr key={line.id}>
              <td>
                {line.label}
                {line.description && <small>{line.description}</small>}
              </td>
              <td className="num">
                {money(line.amount)}
                {line.recurring && <small>per month</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        {quote.vatTreatment === "EXCLUSIVE" && (
          <>
            <div>
              <span>Subtotal</span>
              <span className="num">{money(quote.subtotal + quote.monthlyTotal)}</span>
            </div>
            <div>
              <span>VAT 15%</span>
              <span className="num">{money(quote.vatAmount)}</span>
            </div>
          </>
        )}
        {quote.vatTreatment === "INCLUSIVE" && (
          <div>
            <span>Includes VAT 15%</span>
            <span className="num">{money(quote.vatAmount)}</span>
          </div>
        )}
        <div className="grand">
          <span>Total</span>
          <span className="num">{money(quote.total)}</span>
        </div>
        {quote.monthlyTotal > 0 && (
          <div style={{ fontSize: 13, color: "#52667e" }}>
            <span>Of which monthly</span>
            <span className="num">{money(quote.monthlyTotal)}</span>
          </div>
        )}
      </div>

      {quote.notes && (
        <div className="fine">
          <b>Notes</b>
          <br />
          {quote.notes}
        </div>
      )}

      {quote.vatTreatment === "UNSET" && <div className="warnbox">VAT treatment is not set. Confirm it in Business details before sending this quote.</div>}

      <div className="fine">Scope and final pricing remain subject to this approved quotation. A deposit secures your start date.</div>
    </article>
  );
}

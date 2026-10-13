import { money, dShort } from "@/lib/clickco/format";
import { invoiceBalance, invoicePaid } from "@/lib/clickco/invoice-calc";
import type { InvoiceDTO } from "@/lib/clickco/invoice-calc";
import type { BusinessDetailsForDoc } from "@/components/hub/quote-document-preview";

export interface BankDetailsForDoc extends BusinessDetailsForDoc {
  bankName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
}

/** Mirrors the spec's invoiceDoc(), on screen only (dark mode never applies --
 * an invoice preview is "always light paper", per the original CSS). */
export function InvoiceDocumentPreview({ invoice, settings }: { invoice: InvoiceDTO; settings: BankDetailsForDoc | null }) {
  const balance = invoiceBalance(invoice);
  const paid = invoicePaid(invoice);
  const contactName = `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();

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
          <h3>Invoice</h3>
          <div className="meta num">
            {invoice.number}
            <br />
            Issued {dShort(invoice.issuedAt)}
            <br />
            Due {dShort(invoice.dueDate)}
          </div>
        </div>
      </div>

      <div className="bill">
        <div>
          <small>Billed to</small>
          <b>{contactName}</b>
          <br />
          {invoice.contact.email}
        </div>
        <div>
          <small>Payment details</small>
          {settings?.bankName && settings?.accountNumber ? (
            <>
              <b>{settings.bankName}</b>
              <br />
              Account {settings.accountNumber}
              {settings.branchCode ? (
                <>
                  <br />
                  Branch {settings.branchCode}
                </>
              ) : null}
              <br />
              Reference {invoice.number}
            </>
          ) : (
            <span style={{ color: "#8f5700" }}>Banking details missing. Add them in Business details.</span>
          )}
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
          <tr>
            <td>{invoice.description}</td>
            <td className="num">{money(invoice.amount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="totals">
        <div>
          <span>Invoice total</span>
          <span className="num">{money(invoice.amount)}</span>
        </div>
        {paid > 0 && (
          <div>
            <span>Paid to date</span>
            <span className="num">-{money(paid)}</span>
          </div>
        )}
        <div className={`grand ${balance > 0 ? "due" : ""}`}>
          <span>{balance > 0 ? "Balance due" : "Balance"}</span>
          <span className="num">{money(balance)}</span>
        </div>
      </div>

      {invoice.payments.length > 0 && (
        <div>
          <b style={{ fontSize: 13 }}>Payments received</b>
          <ul className="pay-hist" style={{ marginTop: 6 }}>
            {invoice.payments.map((p) => (
              <li key={p.id}>
                <span>
                  {dShort(p.paidAt)} · {p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
                <b className="num">{money(p.amount)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {balance <= 0 && <div className="stamp">PAID</div>}

      <div className="fine">
        Please use the invoice number as your payment reference and send proof of payment to {settings?.email ?? ""}.
        {settings?.registrationNumber ? ` Reg. ${settings.registrationNumber}.` : ""}
      </div>
    </article>
  );
}

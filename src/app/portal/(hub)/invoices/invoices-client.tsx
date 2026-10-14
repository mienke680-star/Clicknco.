"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconPlus, IconArrowRight } from "@tabler/icons-react";
import { money, dShort, relDay } from "@/lib/clickco/format";
import { invoiceBalance, invoiceStatus } from "@/lib/clickco/invoice-calc";
import { NewInvoiceDialog } from "./new-invoice-dialog";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";
import { PaymentDialog } from "./payment-dialog";
import type { InvoiceDTO } from "@/lib/clickco/invoice-calc";
import type { BankDetailsForDoc } from "@/components/hub/invoice-document-preview";

const INVOICE_TONE: Record<string, string> = { Paid: "good", Overdue: "bad", "Part paid": "warn", Due: "info" };
const FILTERS = ["All", "Unpaid", "Overdue", "Part paid", "Paid"] as const;
type Filter = (typeof FILTERS)[number];

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

function matchesFilter(invoice: InvoiceDTO, filter: Filter): boolean {
  if (filter === "All") return true;
  if (filter === "Unpaid") return invoiceBalance(invoice) > 0;
  return invoiceStatus(invoice) === filter;
}

export function InvoicesClient({
  invoices: initialInvoices,
  contacts,
  businessSettings,
  canCreate,
  canEdit,
}: {
  invoices: InvoiceDTO[];
  contacts: ContactOption[];
  businessSettings: BankDetailsForDoc | null;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = React.useState(initialInvoices);
  const [filter, setFilter] = React.useState<Filter>("All");
  const [newOpen, setNewOpen] = React.useState(false);
  const [payingInvoice, setPayingInvoice] = React.useState<InvoiceDTO | undefined>(undefined);

  const openInvoiceId = searchParams.get("open");
  const openInvoice = invoices.find((i) => i.id === openInvoiceId);

  function setOpenInvoiceId(id: string | null) {
    router.push(id ? `${pathname}?open=${id}` : pathname);
  }

  function upsertInvoice(invoice: InvoiceDTO) {
    setInvoices((prev) => (prev.some((i) => i.id === invoice.id) ? prev.map((i) => (i.id === invoice.id ? invoice : i)) : [invoice, ...prev]));
  }

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const unpaid = invoices.filter((i) => invoiceBalance(i) > 0);
  const overdue = invoices.filter((i) => invoiceStatus(i) === "Overdue");
  const collectedThisMonth = invoices.flatMap((i) => i.payments).filter((p) => new Date(p.paidAt).toISOString().slice(0, 7) === ym).reduce((s, p) => s + p.amount, 0);
  const invoicedThisMonth = invoices.filter((i) => new Date(i.issuedAt).toISOString().slice(0, 7) === ym).reduce((s, i) => s + i.amount, 0);

  const sorted = [...invoices].filter((i) => matchesFilter(i, filter)).sort((a, b) => b.number.localeCompare(a.number));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Cash flow</p>
          <h1 tabIndex={-1}>Invoices</h1>
          <p>Part payments, reminders and a payment record behind every invoice.</p>
        </div>
        {canCreate && (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
              <IconPlus className="i" stroke={1.75} /> New invoice
            </button>
          </div>
        )}
      </div>

      <div className="stats">
        <div className="stat">
          <small>Outstanding</small>
          <b className="num">{money(unpaid.reduce((s, i) => s + invoiceBalance(i), 0))}</b>
          <em>{unpaid.length} unpaid</em>
        </div>
        <div className="stat">
          <small>Overdue</small>
          <b className="num">{money(overdue.reduce((s, i) => s + invoiceBalance(i), 0))}</b>
          <em className={overdue.length ? "bad" : "good"}>{overdue.length ? `${overdue.length} late` : "All on time"}</em>
        </div>
        <div className="stat">
          <small>Collected this month</small>
          <b className="num">{money(collectedThisMonth)}</b>
          <em className="good">Payments received</em>
        </div>
        <div className="stat">
          <small>Invoiced this month</small>
          <b className="num">{money(invoicedThisMonth)}</b>
          <em>Issued so far</em>
        </div>
      </div>

      <div className="filter-row">
        <div className="chips" role="group" aria-label="Filter invoices">
          {FILTERS.map((f) => (
            <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f} <b>{invoices.filter((i) => matchesFilter(i, f)).length}</b>
            </button>
          ))}
        </div>
      </div>

      <section className="panel">
        {sorted.length === 0 ? (
          <div className="empty">
            <b>No invoices here</b>
            <span>Change the filter to see the rest.</span>
          </div>
        ) : (
          <div className="rows">
            <div className="row hd iv-cols">
              <span>Invoice</span>
              <span>Client</span>
              <span>Due</span>
              <span style={{ textAlign: "right" }}>Balance</span>
              <span>Status</span>
              <span></span>
              <span></span>
            </div>
            {sorted.map((i) => {
              const status = invoiceStatus(i);
              const balance = invoiceBalance(i);
              const contactName = `${i.contact.firstName} ${i.contact.lastName ?? ""}`.trim();
              return (
                <div key={i.id} className="row iv-cols">
                  <button className="row-open" onClick={() => setOpenInvoiceId(i.id)}>
                    <b className="num">{i.number}</b>
                    <small className="ellip">{i.description}</small>
                  </button>
                  <div className="ellip">
                    {contactName}
                    {i.remindedAt && <small>Reminded {relDay(i.remindedAt)}</small>}
                  </div>
                  <div>
                    <span className="num">{dShort(i.dueDate)}</span>
                    <small>{balance > 0 ? relDay(i.dueDate) : "Settled"}</small>
                  </div>
                  <div className="num" style={{ textAlign: "right" }}>
                    <b>{balance > 0 ? money(balance) : money(i.amount)}</b>
                    {balance > 0 && balance < i.amount && <small>of {money(i.amount)}</small>}
                  </div>
                  <div>
                    <span className={`pill ${INVOICE_TONE[status]}`}>{status}</span>
                  </div>
                  <div>
                    {balance > 0 && canEdit && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setPayingInvoice(i)}>
                        Record payment
                      </button>
                    )}
                  </div>
                  <button className="icon-btn sm" onClick={() => setOpenInvoiceId(i.id)} aria-label={`Open ${i.number}`}>
                    <IconArrowRight className="i sm" stroke={1.75} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <p style={{ marginTop: 14, color: "var(--muted)", fontSize: 14, maxWidth: "70ch" }}>
        Marking an invoice paid always creates a dated payment with amount, method and reference. Part payments and corrections stay traceable.
      </p>

      {newOpen && (
        <NewInvoiceDialog
          onClose={() => setNewOpen(false)}
          contacts={contacts}
          onSaved={(invoice) => {
            upsertInvoice(invoice);
            setNewOpen(false);
            setOpenInvoiceId(invoice.id);
          }}
        />
      )}

      {openInvoice && (
        <InvoiceDetailDialog
          key={openInvoice.id}
          onClose={() => setOpenInvoiceId(null)}
          invoice={openInvoice}
          businessSettings={businessSettings}
          canEdit={canEdit}
          onChanged={upsertInvoice}
        />
      )}

      {payingInvoice && (
        <PaymentDialog
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(undefined)}
          onSaved={(updated) => {
            upsertInvoice(updated);
            setPayingInvoice(undefined);
          }}
        />
      )}
    </>
  );
}

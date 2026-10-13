"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { money, dShort } from "@/lib/clickco/format";
import { QuoteBuilderDialog } from "./quote-builder-dialog";
import { QuoteDetailDialog } from "./quote-detail-dialog";
import type { QuoteDTO } from "@/lib/clickco/quotes";
import type { PackageDTO, AddonDTO } from "@/lib/clickco/packages";
import type { VatTreatment } from "@/generated/prisma/client";
import type { BusinessDetailsForDoc } from "@/components/hub/quote-document-preview";

const QUOTE_TONE: Record<string, string> = { DRAFT: "", SENT: "info", VIEWED: "violet", ACCEPTED: "good", DECLINED: "bad" };
const QUOTE_LABEL: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", ACCEPTED: "Accepted", DECLINED: "Declined" };

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export function QuotesClient({
  quotes: initialQuotes,
  packages,
  addons,
  contacts,
  vatTreatment,
  nextQuoteNumber,
  businessSettings,
  canCreate,
}: {
  quotes: QuoteDTO[];
  packages: PackageDTO[];
  addons: AddonDTO[];
  contacts: ContactOption[];
  vatTreatment: VatTreatment;
  nextQuoteNumber: number;
  businessSettings: BusinessDetailsForDoc | null;
  canCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = React.useState(initialQuotes);
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingQuote, setEditingQuote] = React.useState<QuoteDTO | undefined>(undefined);

  // The open quote is derived from the URL (?open=<id>), not local state --
  // a search-result link can deep-link straight to it, and there's no
  // reset-on-navigation state to keep in sync.
  const openQuoteId = searchParams.get("open");
  const openQuote = quotes.find((q) => q.id === openQuoteId);

  function setOpenQuoteId(id: string | null) {
    router.push(id ? `${pathname}?open=${id}` : pathname);
  }
  const sorted = [...quotes].sort((a, b) => b.number.localeCompare(a.number));
  const open = quotes.filter((q) => q.status === "SENT" || q.status === "VIEWED");
  const accepted = quotes.filter((q) => q.status === "ACCEPTED");
  const sentOrDecided = quotes.filter((q) => q.status !== "DRAFT");
  const conv = sentOrDecided.length ? Math.round((accepted.length / sentOrDecided.length) * 100) : 0;

  function upsertQuote(quote: QuoteDTO) {
    setQuotes((prev) => {
      const exists = prev.some((q) => q.id === quote.id);
      return exists ? prev.map((q) => (q.id === quote.id ? quote : q)) : [quote, ...prev];
    });
    router.refresh();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Sell with clarity</p>
          <h1 tabIndex={-1}>Quotes</h1>
          <p>Build accurate proposals from your real packages, payment plans and add-ons.</p>
        </div>
        {canCreate && (
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingQuote(undefined);
                setBuilderOpen(true);
              }}
            >
              <IconPlus className="i" stroke={1.75} /> New quote
            </button>
          </div>
        )}
      </div>

      <div className="stats">
        <div className="stat">
          <small>Awaiting reply</small>
          <b className="num">{money(open.reduce((s, q) => s + q.total, 0))}</b>
          <em>{open.length} open</em>
        </div>
        <div className="stat">
          <small>Accepted</small>
          <b className="num">{money(accepted.reduce((s, q) => s + q.total, 0))}</b>
          <em className="good">{accepted.length} quotes</em>
        </div>
        <div className="stat">
          <small>Drafts</small>
          <b className="num">{quotes.filter((q) => q.status === "DRAFT").length}</b>
          <em>Not yet sent</em>
        </div>
        <div className="stat">
          <small>Acceptance rate</small>
          <b className="num">{conv}%</b>
          <em>Of {sentOrDecided.length} sent</em>
        </div>
      </div>

      <section className="panel">
        {sorted.length === 0 ? (
          <div className="empty">
            <b>No quotes yet</b>
            <p>Build your first quote from the catalogue.</p>
          </div>
        ) : (
          <div className="rows">
            <div className="row hd qt-cols">
              <span>Quote</span>
              <span>Client</span>
              <span>Package</span>
              <span style={{ textAlign: "right" }}>Value</span>
              <span>Status</span>
              <span></span>
            </div>
            {sorted.map((q) => (
              <div key={q.id} className="row qt-cols">
                <button className="row-open" onClick={() => setOpenQuoteId(q.id)}>
                  <b className="num">{q.number}</b>
                  <small>
                    {dShort(q.issuedAt)}
                    {q.status === "SENT" || q.status === "VIEWED" ? ` · valid to ${dShort(q.validUntil)}` : ""}
                  </small>
                </button>
                <div className="ellip">
                  {q.contact.firstName} {q.contact.lastName ?? ""}
                </div>
                <div className="ellip">{q.package.name}</div>
                <div className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {money(q.total)}
                </div>
                <div>
                  <span className={`pill ${QUOTE_TONE[q.status]}`}>{QUOTE_LABEL[q.status]}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setOpenQuoteId(q.id)}>
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {builderOpen && (
        <QuoteBuilderDialog
          key={editingQuote?.id ?? "new"}
          onClose={() => setBuilderOpen(false)}
          contacts={contacts}
          packages={packages}
          addons={addons}
          vatTreatment={vatTreatment}
          businessSettings={businessSettings}
          nextQuoteNumber={nextQuoteNumber}
          editQuote={editingQuote}
          onSaved={(quote) => {
            upsertQuote(quote);
            setBuilderOpen(false);
            setOpenQuoteId(quote.id);
          }}
        />
      )}

      {openQuote && (
        <QuoteDetailDialog
          key={openQuote.id}
          onClose={() => setOpenQuoteId(null)}
          quote={openQuote}
          businessSettings={businessSettings}
          onChanged={upsertQuote}
          onEdit={() => {
            setEditingQuote(openQuote);
            setOpenQuoteId(null);
            setBuilderOpen(true);
          }}
        />
      )}
    </>
  );
}

"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IconUserPlus, IconDownload, IconUpload, IconArrowRight } from "@tabler/icons-react";
import { useHubToast } from "@/components/hub/toast";
import { money, dShort, initials, avatarClass } from "@/lib/clickco/format";
import { clientNeedsAttention, currentWorkFor, clientOwed } from "@/lib/clickco/client-calc";
import { QuoteBuilderDialog } from "../quotes/quote-builder-dialog";
import { ClientDetailDialog } from "./client-detail-dialog";
import { ClientFormDialog } from "./client-form-dialog";
import { ImportDialog } from "./import-dialog";
import type { ClientDTO } from "@/lib/clickco/client-calc";
import type { PackageDTO, AddonDTO } from "@/lib/clickco/packages";
import type { VatTreatment } from "@/generated/prisma/client";
import type { BusinessDetailsForDoc } from "@/components/hub/quote-document-preview";
import type { QuoteDTO } from "@/lib/clickco/quotes";

interface Tag {
  id: string;
  name: string;
  color: string;
}
interface UserOption {
  id: string;
  name: string;
}

const STATUS_TONE: Record<string, string> = { Active: "good", Retainer: "violet", Onboarding: "info", Quoted: "warn", Lead: "pink", Complete: "" };

const FILTERS: [string, (c: ClientDTO) => boolean][] = [
  ["All", () => true],
  ["Active", (c) => ["Active", "Retainer", "Onboarding"].includes(c.status ?? "")],
  ["Needs attention", (c) => clientNeedsAttention(c)],
  ["Leads and quotes", (c) => ["Lead", "Quoted"].includes(c.status ?? "")],
];

export function ContactsClient({
  clients: initialClients,
  tags,
  users,
  packages,
  addons,
  vatTreatment,
  nextQuoteNumber,
  businessSettings,
  canCreate,
  canEdit,
  canDelete,
  canExport,
  canCreateQuote,
}: {
  clients: ClientDTO[];
  tags: Tag[];
  users: UserOption[];
  packages: PackageDTO[];
  addons: AddonDTO[];
  vatTreatment: VatTreatment;
  nextQuoteNumber: number;
  businessSettings: BusinessDetailsForDoc | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canCreateQuote: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useHubToast();
  const [clients, setClients] = React.useState(initialClients);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState(FILTERS[0]![0]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<ClientDTO | undefined>(undefined);
  const [importOpen, setImportOpen] = React.useState(false);
  const [quoteForContactId, setQuoteForContactId] = React.useState<string | null>(null);

  const openClientId = searchParams.get("open");
  const openClient = clients.find((c) => c.id === openClientId);

  function setOpenClientId(id: string | null) {
    router.push(id ? `${pathname}?open=${id}` : pathname);
  }

  function upsertClient(client: ClientDTO) {
    setClients((prev) => (prev.some((c) => c.id === client.id) ? prev.map((c) => (c.id === client.id ? client : c)) : [client, ...prev]));
  }

  function removeClient(id: string) {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  const q = query.trim().toLowerCase();
  const activeFilter = FILTERS.find(([name]) => name === filter) ?? FILTERS[0]!;
  const list = clients.filter((c) => {
    const haystack = `${c.firstName} ${c.lastName ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${c.company ?? ""}`.toLowerCase();
    return (!q || haystack.includes(q)) && activeFilter[1](c);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Relationships</p>
          <h1 tabIndex={-1}>Clients</h1>
          <p>Every conversation, project, quote and payment sits on one client record.</p>
        </div>
        <div className="actions">
          {canExport && (
            <button className="btn btn-secondary" onClick={() => window.open("/api/contacts/export", "_blank")}>
              <IconDownload className="i" stroke={1.75} /> Export CSV
            </button>
          )}
          {canCreate && (
            <button className="btn btn-secondary" onClick={() => setImportOpen(true)}>
              <IconUpload className="i" stroke={1.75} /> Import CSV
            </button>
          )}
          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingClient(undefined);
                setFormOpen(true);
              }}
            >
              <IconUserPlus className="i" stroke={1.75} /> Add client
            </button>
          )}
        </div>
      </div>

      <div className="filter-row">
        <label className="sr" htmlFor="cl-q">
          Search clients
        </label>
        <input id="cl-q" className="input" type="search" placeholder="Search clients" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips" role="group" aria-label="Filter clients">
          {FILTERS.map(([name, fn]) => (
            <button key={name} className="chip" aria-pressed={filter === name} onClick={() => setFilter(name)}>
              {name} <b>{clients.filter(fn).length}</b>
            </button>
          ))}
        </div>
      </div>

      <section className="panel">
        {list.length === 0 ? (
          <div className="empty">
            <b>No clients match</b>
            <span>Clear the search or switch filter.</span>
          </div>
        ) : (
          <div className="rows">
            <div className="row hd cl-cols">
              <span>Client</span>
              <span>Contact</span>
              <span>Current work</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Owed</span>
              <span></span>
            </div>
            {list.map((c) => {
              const fullName = `${c.firstName} ${c.lastName ?? ""}`.trim();
              const owed = clientOwed(c);
              const work = currentWorkFor(c);
              const attention = clientNeedsAttention(c);
              return (
                <div key={c.id} className="row cl-cols">
                  <button className="row-open who-cell" onClick={() => setOpenClientId(c.id)}>
                    <span className={`mini-av ${avatarClass(c.id)}`}>{initials(fullName)}</span>
                    <div>
                      <b className="ellip">{fullName}</b>
                      {attention ? <small style={{ color: "var(--bad)" }}>Needs attention</small> : <small>Client since {dShort(c.createdAt)}</small>}
                    </div>
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <b className="ellip" style={{ display: "block", fontWeight: 500 }}>
                      {c.phone || "—"}
                    </b>
                    <small className="num">{c.email}</small>
                  </div>
                  <div style={{ minWidth: 0 }} className="ellip">
                    {work ? work.name : <span style={{ color: "var(--muted)" }}>No project</span>}
                  </div>
                  <div>
                    <span className={`pill ${STATUS_TONE[c.status ?? ""] ?? ""}`}>{c.status ?? "Lead"}</span>
                  </div>
                  <div className={`num owed ${owed ? "" : "none"}`} style={{ textAlign: "right", fontWeight: owed ? 600 : undefined }}>
                    {owed ? money(owed) : "-"}
                  </div>
                  <button className="icon-btn sm" onClick={() => setOpenClientId(c.id)} aria-label={`Open ${fullName}`}>
                    <IconArrowRight className="i" stroke={1.75} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <ClientFormDialog
          key={editingClient?.id ?? "new"}
          client={editingClient}
          tags={tags}
          users={users}
          onClose={() => setFormOpen(false)}
          onSaved={(client) => {
            upsertClient(client);
            setFormOpen(false);
          }}
        />
      )}

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onDone={() => {
            setImportOpen(false);
            router.refresh();
          }}
        />
      )}

      {openClient && (
        <ClientDetailDialog
          key={openClient.id}
          client={openClient}
          canEdit={canEdit}
          canDelete={canDelete}
          canCreateQuote={canCreateQuote}
          onClose={() => setOpenClientId(null)}
          onChanged={upsertClient}
          onDeleted={() => {
            removeClient(openClient.id);
            setOpenClientId(null);
          }}
          onEdit={() => {
            setEditingClient(openClient);
            setOpenClientId(null);
            setFormOpen(true);
          }}
          onNewQuote={() => {
            setQuoteForContactId(openClient.id);
            setOpenClientId(null);
          }}
        />
      )}

      {quoteForContactId && (
        <QuoteBuilderDialog
          contacts={clients}
          packages={packages}
          addons={addons}
          vatTreatment={vatTreatment}
          businessSettings={businessSettings}
          nextQuoteNumber={nextQuoteNumber}
          defaultContactId={quoteForContactId}
          onClose={() => setQuoteForContactId(null)}
          onSaved={(quote: QuoteDTO) => {
            toast.show(`Quote ${quote.number} saved`);
            setQuoteForContactId(null);
          }}
        />
      )}
    </>
  );
}

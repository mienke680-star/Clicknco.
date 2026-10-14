"use client";

import * as React from "react";
import Link from "next/link";
import { IconBrandWhatsapp, IconCopy, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiPatch, apiDelete } from "@/lib/api-client";
import { money, dShort } from "@/lib/clickco/format";
import { invoiceBalance, invoiceStatus } from "@/lib/clickco/invoice-calc";
import { clientNeedsAttention, clientOwed, clientPaidToDate } from "@/lib/clickco/client-calc";
import type { ClientDTO } from "@/lib/clickco/client-calc";

const STATUS_TONE: Record<string, string> = { Active: "good", Retainer: "violet", Onboarding: "info", Quoted: "warn", Lead: "pink", Complete: "" };
const QUOTE_TONE: Record<string, string> = { DRAFT: "", SENT: "info", VIEWED: "violet", ACCEPTED: "good", DECLINED: "bad" };
const INVOICE_TONE: Record<string, string> = { Paid: "good", Overdue: "bad", "Part paid": "warn", Due: "info" };
const PROJECT_STAGE_LABEL: Record<string, string> = {
  ONBOARDING: "Onboarding",
  IN_PRODUCTION: "In production",
  CLIENT_REVIEW: "Client review",
  WAITING_FOR_CLIENT: "Waiting for client",
  LAUNCHED: "Launched",
};

export interface ClientDetailDialogProps {
  onClose: () => void;
  client: ClientDTO;
  canEdit: boolean;
  canDelete: boolean;
  canCreateQuote: boolean;
  onChanged: (client: ClientDTO) => void;
  onDeleted: () => void;
  onEdit: () => void;
  onNewQuote: () => void;
}

export function ClientDetailDialog({ onClose, client, canEdit, canDelete, canCreateQuote, onChanged, onDeleted, onEdit, onNewQuote }: ClientDetailDialogProps) {
  const toast = useHubToast();
  const [note, setNote] = React.useState(client.clientNote ?? "");
  const [deleting, setDeleting] = React.useState(false);

  const fullName = `${client.firstName} ${client.lastName ?? ""}`.trim();
  const owed = clientOwed(client);
  const paidToDate = clientPaidToDate(client);
  const attention = clientNeedsAttention(client);

  async function saveNote() {
    if (note === (client.clientNote ?? "")) return;
    try {
      await apiPatch(`/api/contacts/${client.id}`, { clientNote: note });
      onChanged({ ...client, clientNote: note });
    } catch {
      toast.show("Couldn't save the note", "error");
    }
  }

  async function copyEmail() {
    if (!client.email) return;
    try {
      await navigator.clipboard.writeText(client.email);
      toast.show("Email copied");
    } catch {
      toast.show("Couldn't copy", "error");
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${fullName}? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/contacts/${client.id}`);
      toast.show("Client deleted");
      onDeleted();
    } catch {
      toast.show("Couldn't delete the client", "error");
    } finally {
      setDeleting(false);
    }
  }

  const waHref = client.phone ? `https://wa.me/${client.phone.replace(/\D/g, "")}` : undefined;

  return (
    <HubDialog open onClose={onClose}>
      <div className="dlg-head">
        <div>
          <small>Client</small>
          <h2>{fullName}</h2>
        </div>
      </div>
      <div className="dlg-body">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span className={`pill ${STATUS_TONE[client.status ?? ""] ?? ""}`}>{client.status ?? "Lead"}</span>
          {attention && <span className="pill bad">Needs attention</span>}
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Client since {dShort(client.createdAt)}</span>
        </div>

        <div className="grid-2">
          <div>
            <b>
              {client.company || fullName}
              {client.company && <span style={{ display: "block", fontWeight: 400, color: "var(--ink-2)" }}>{fullName}</span>}
            </b>
            <div className="num" style={{ color: "var(--ink-2)" }}>
              {client.phone || "—"}
            </div>
            <div style={{ color: "var(--ink-2)", wordBreak: "break-all" }}>{client.email}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignContent: "flex-start" }}>
            {waHref && (
              <a className="btn btn-secondary btn-sm" target="_blank" rel="noopener" href={waHref}>
                <IconBrandWhatsapp className="i sm" stroke={1.75} /> WhatsApp
              </a>
            )}
            {client.email && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={copyEmail}>
                <IconCopy className="i sm" stroke={1.75} /> Copy email
              </button>
            )}
          </div>
        </div>

        <div className="stats" style={{ margin: 0, gridTemplateColumns: "1fr 1fr" }}>
          <div className="stat">
            <small>Paid to date</small>
            <b className="num">{money(paidToDate)}</b>
          </div>
          <div className="stat">
            <small>Owing now</small>
            <b className="num" style={owed ? { color: "var(--bad)" } : undefined}>
              {money(owed)}
            </b>
          </div>
        </div>

        <div>
          <b>Work</b>
          <ul className="mini-list" style={{ marginTop: 6 }}>
            {client.projects.length === 0 ? (
              <li style={{ color: "var(--muted)" }}>No projects yet</li>
            ) : (
              client.projects.map((p) => (
                <li key={p.id}>
                  <Link className="link-btn" href={`/portal/projects?open=${p.id}`}>
                    {p.name}
                  </Link>
                  <span className="pill" style={{ marginLeft: "auto" }}>
                    {PROJECT_STAGE_LABEL[p.stage] ?? p.stage}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <b>Quotes and invoices</b>
          <ul className="mini-list" style={{ marginTop: 6 }}>
            {client.quotes.length === 0 && client.invoices.length === 0 && <li style={{ color: "var(--muted)" }}>Nothing yet</li>}
            {client.quotes.map((q) => (
              <li key={q.id}>
                <Link className="link-btn num" href={`/portal/quotes?open=${q.id}`}>
                  {q.number}
                </Link>
                <span className={`pill ${QUOTE_TONE[q.status]}`} style={{ marginLeft: "auto" }}>
                  {q.status[0]}
                  {q.status.slice(1).toLowerCase()}
                </span>
              </li>
            ))}
            {client.invoices.map((i) => {
              const status = invoiceStatus(i);
              return (
                <li key={i.id}>
                  <Link className="link-btn num" href={`/portal/invoices?open=${i.id}`}>
                    {i.number}
                  </Link>
                  <span className="num" style={{ marginLeft: "auto" }}>
                    {money(invoiceBalance(i))}
                  </span>
                  <span className={`pill ${INVOICE_TONE[status]}`}>{status}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} disabled={!canEdit} />
          <small>Saved as you leave the field.</small>
        </label>
      </div>
      <div className="dlg-foot">
        <div style={{ display: "flex", gap: 10 }}>
          {canEdit && (
            <button className="btn btn-secondary" onClick={onEdit}>
              <IconPencil className="i sm" stroke={1.75} /> Edit details
            </button>
          )}
          {canDelete && (
            <button className="btn btn-danger" disabled={deleting} onClick={remove}>
              <IconTrash className="i sm" stroke={1.75} /> Delete
            </button>
          )}
        </div>
        <div className="r">
          {canCreateQuote && (
            <button className="btn btn-primary" onClick={onNewQuote}>
              <IconPlus className="i sm" stroke={1.75} /> New quote
            </button>
          )}
        </div>
      </div>
    </HubDialog>
  );
}

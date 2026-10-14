"use client";

import * as React from "react";
import { IconUpload } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import { useHubToast } from "@/components/hub/toast";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface ImportDialogProps {
  onClose: () => void;
  onDone: () => void;
}

/** Mount this only while it should be open -- see ComposeDialog for why. */
export function ImportDialog({ onClose, onDone }: ImportDialogProps) {
  const toast = useHubToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);

  async function onImport() {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch<{ created: number; updated: number; skipped: number }>("/api/contacts/import", { method: "POST", body: formData });
      toast.show(`Import complete: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped.`);
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Import failed", "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <HubDialog open onClose={onClose}>
      <div className="dlg-head">
        <div>
          <small>Clients</small>
          <h2>Import clients</h2>
        </div>
      </div>
      <div className="dlg-body">
        <p style={{ color: "var(--ink-2)" }}>Upload a CSV with columns like First Name, Last Name, Email, Phone, Company.</p>
        <input className="input" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="dlg-foot">
        <span></span>
        <div className="r">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!file || importing} onClick={onImport}>
            <IconUpload className="i sm" stroke={1.75} /> Import
          </button>
        </div>
      </div>
    </HubDialog>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { IconCheck, IconPlus, IconCopy, IconArchive, IconArchiveOff, IconDownload } from "@tabler/icons-react";
import { money } from "@/lib/clickco/format";
import { apiFetch, apiPost, apiPatch } from "@/lib/api-client";
import { useHubToast } from "@/components/hub/toast";
import { PackageDialog, useConfirm } from "./package-dialog";
import { AddonDialog } from "./addon-dialog";
import type { PackageDTO, AddonDTO } from "@/lib/clickco/packages";

export function PackagesClient({ packages: initialPackages, addons: initialAddons }: { packages: PackageDTO[]; addons: AddonDTO[] }) {
  const toast = useHubToast();
  const [packages, setPackages] = React.useState(initialPackages);
  const [addons, setAddons] = React.useState(initialAddons);
  const [category, setCategory] = React.useState("All");
  const [showArchived, setShowArchived] = React.useState(false);
  const [editingPkg, setEditingPkg] = React.useState<PackageDTO | null | "new">(null);
  const [editingAddon, setEditingAddon] = React.useState<AddonDTO | null | "new">(null);
  const [importing, setImporting] = React.useState(false);
  const archiveConfirm = useConfirm();

  const categories = ["All", ...new Set(packages.map((p) => p.category))];
  const visible = category === "All" ? packages : packages.filter((p) => p.category === category);

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    try {
      const data = await apiFetch<{ packages: PackageDTO[]; addons: AddonDTO[] }>(`/api/packages?includeArchived=${next ? "1" : "0"}`);
      setPackages(data.packages);
      setAddons(data.addons);
    } catch {
      toast.show("Couldn't load packages", "error");
    }
  }

  function upsertPackage(pkg: PackageDTO) {
    setPackages((prev) => {
      const idx = prev.findIndex((p) => p.id === pkg.id);
      if (idx === -1) return [...prev, pkg];
      const copy = [...prev];
      copy[idx] = pkg;
      return copy;
    });
  }

  function upsertAddon(addon: AddonDTO) {
    setAddons((prev) => {
      const idx = prev.findIndex((a) => a.id === addon.id);
      if (idx === -1) return [...prev, addon];
      const copy = [...prev];
      copy[idx] = addon;
      return copy;
    });
  }

  async function duplicatePackage(pkg: PackageDTO) {
    try {
      const result = await apiPost<{ package: PackageDTO }>(`/api/packages/${pkg.id}/duplicate`);
      upsertPackage(result.package);
      toast.show("Package duplicated");
    } catch {
      toast.show("Couldn't duplicate the package", "error");
    }
  }

  async function archivePackage(pkg: PackageDTO) {
    try {
      const result = await apiPatch<{ package: PackageDTO }>(`/api/packages/${pkg.id}`, { active: !pkg.active });
      upsertPackage(result.package);
      toast.show(pkg.active ? "Package archived" : "Package restored");
    } catch {
      toast.show("Couldn't update the package", "error");
    }
  }

  async function archiveAddon(addon: AddonDTO) {
    try {
      const result = await apiPatch<{ addon: AddonDTO }>(`/api/addons/${addon.id}`, { active: !addon.active });
      upsertAddon(result.addon);
      toast.show(addon.active ? "Add-on archived" : "Add-on restored");
    } catch {
      toast.show("Couldn't update the add-on", "error");
    }
  }

  async function importCatalogue() {
    setImporting(true);
    try {
      const result = await apiPost<{ created: number; updated: number; addonsCreated: number }>("/api/packages/import-catalogue");
      const data = await apiFetch<{ packages: PackageDTO[]; addons: AddonDTO[] }>(`/api/packages?includeArchived=${showArchived ? "1" : "0"}`);
      setPackages(data.packages);
      setAddons(data.addons);
      toast.show(`Imported: ${result.created} new, ${result.updated} updated, ${result.addonsCreated} add-ons`);
    } catch {
      toast.show("Couldn't import the catalogue", "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Your catalogue</p>
          <h1 tabIndex={-1}>Services and packages</h1>
          <p>The brochure as structured data, ready for quoting and invoicing.</p>
        </div>
        <div className="r" style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={toggleArchived}>
            {showArchived ? <IconArchiveOff className="i sm" stroke={1.75} /> : <IconArchive className="i sm" stroke={1.75} />}
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={importCatalogue} disabled={importing}>
            <IconDownload className="i sm" stroke={1.75} /> {importing ? "Importing…" : "Import Click & Co catalogue"}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setEditingPkg("new")}>
            <IconPlus className="i sm" stroke={1.75} /> Add package
          </button>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <b>No packages yet</b>
            <p>Add your own, or click "Import Click & Co catalogue" above to load the real brochure packages and prices.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="filter-row">
            <div className="chips" role="group" aria-label="Package category">
              {categories.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="pk-grid">
            {visible.map((p) => (
              <article key={p.id} className={`pk ${p.featured ? "feat" : ""}`} style={!p.active ? { opacity: 0.55 } : undefined}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className="pill">{p.category}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {p.featured && <span className="pill pink">Popular</span>}
                    {!p.active && <span className="pill">Archived</span>}
                  </div>
                </div>
                <h3>{p.name}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>{p.strapline}</p>
                {p.customQuote ? (
                  <div className="price num">Custom quotation</div>
                ) : (
                  <div className="price num">
                    {money(p.price)} <small>{p.billing === "MONTHLY" ? "per month" : "once-off"}</small>
                  </div>
                )}
                {p.deposit != null && (
                  <div className="plan">
                    Or {money(p.deposit)} deposit + {money(p.instalment)} x {p.instalmentMonths} months
                  </div>
                )}
                {p.onboarding != null && (
                  <div className="plan">
                    + {money(p.onboarding)} onboarding{p.minimumMonths ? `, ${p.minimumMonths} month minimum` : ""}
                  </div>
                )}
                {p.turnaroundLabel && (
                  <div className="plan" style={{ color: "var(--muted)" }}>
                    Turnaround: {p.turnaroundLabel}
                  </div>
                )}
                <ul>
                  {p.features.slice(0, 6).map((f) => (
                    <li key={f}>
                      <IconCheck className="i sm" stroke={1.75} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="r" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingPkg(p)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => duplicatePackage(p)}>
                    <IconCopy className="i sm" stroke={1.75} /> Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => (p.active ? archiveConfirm.confirm(p.name, () => archivePackage(p)) : archivePackage(p))}
                  >
                    {p.active ? "Archive" : "Restore"}
                  </button>
                  <Link href="/portal/quotes" className="btn btn-ghost btn-sm">
                    Create quote
                  </Link>
                  <Link href="/portal/invoices" className="btn btn-ghost btn-sm">
                    Create invoice
                  </Link>
                  <Link href="/portal/projects" className="btn btn-ghost btn-sm">
                    Start project
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Add-ons</h2>
                <p>Price each one into any quote</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingAddon("new")}>
                <IconPlus className="i sm" stroke={1.75} /> Add add-on
              </button>
            </div>
            <div className="addons">
              {addons.map((a) => (
                <div key={a.id} className="addon" style={!a.active ? { opacity: 0.55 } : undefined}>
                  <span>
                    {a.name}
                    {!a.active && " (archived)"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <b>{a.customQuote ? "Quoted" : `${money(a.price)}${a.billing === "MONTHLY" ? " /mo" : ""}`}</b>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingAddon(a)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => archiveAddon(a)}>
                      {a.active ? "Archive" : "Restore"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {editingPkg && (
        <PackageDialog
          existing={editingPkg === "new" ? null : editingPkg}
          onClose={() => setEditingPkg(null)}
          onSaved={(pkg) => {
            upsertPackage(pkg);
            setEditingPkg(null);
          }}
        />
      )}
      {editingAddon && (
        <AddonDialog
          existing={editingAddon === "new" ? null : editingAddon}
          onClose={() => setEditingAddon(null)}
          onSaved={(addon) => {
            upsertAddon(addon);
            setEditingAddon(null);
          }}
        />
      )}
      {archiveConfirm.node}
    </>
  );
}

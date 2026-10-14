"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import { money } from "@/lib/clickco/format";
import type { PackageDTO, AddonDTO } from "@/lib/clickco/packages";

export function PackagesClient({ packages, addons }: { packages: PackageDTO[]; addons: AddonDTO[] }) {
  const [category, setCategory] = React.useState("All");
  const categories = ["All", ...new Set(packages.map((p) => p.category))];
  const visible = category === "All" ? packages : packages.filter((p) => p.category === category);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Your catalogue</p>
          <h1 tabIndex={-1}>Services and packages</h1>
          <p>The brochure as structured data, ready for quoting and invoicing.</p>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <b>No packages yet</b>
            <p>Add your services from Prisma Studio or the catalogue seed script for now — a packages editor is coming.</p>
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
              <article key={p.id} className={`pk ${p.featured ? "feat" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className="pill">{p.category}</span>
                  {p.featured && <span className="pill pink">Popular</span>}
                </div>
                <h3>{p.name}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>{p.strapline}</p>
                <div className="price num">
                  {money(p.price)} <small>{p.billing === "MONTHLY" ? "per month" : "once-off"}</small>
                </div>
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
                <ul>
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f}>
                      <IconCheck className="i sm" stroke={1.75} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Add-ons</h2>
                <p>Price each one into any quote</p>
              </div>
            </div>
            <div className="addons">
              {addons.map((a) => (
                <div key={a.id} className="addon">
                  <span>{a.name}</span>
                  <b>
                    {money(a.price)}
                    {a.billing === "MONTHLY" ? " /mo" : ""}
                  </b>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}

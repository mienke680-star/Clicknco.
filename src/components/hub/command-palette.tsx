"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";
import { HubDialog } from "@/components/hub/dialog";
import type { Icon } from "@tabler/icons-react";

export interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  group: string;
  href: string;
  icon?: Icon;
}

/** Ctrl+K / Cmd+K command palette. Phase 1 searches nav destinations only;
 * later phases pass a richer `items` list (clients/quotes/invoices/projects). */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  function openPalette() {
    setQ("");
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          openPalette();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((i) => i.label.toLowerCase().includes(query) || i.sub?.toLowerCase().includes(query));
  }, [items, q]);

  const groups = React.useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) {
        map.set(item.group, []);
        order.push(item.group);
      }
      map.get(item.group)!.push(item);
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }));
  }, [filtered]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button type="button" className="search-btn" onClick={openPalette} aria-label="Search">
        <IconSearch className="i sm" stroke={1.75} />
        <span>Search clients, quotes, invoices…</span>
        <kbd>Ctrl K</kbd>
      </button>
      <HubDialog open={open} onClose={() => setOpen(false)} className="cmdk">
        <div className="pal-in">
          <IconSearch className="i" stroke={1.75} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            aria-label="Search"
          />
        </div>
        <ul className="pal-list">
          {groups.length === 0 && (
            <li className="empty">
              <b>No matches</b>
            </li>
          )}
          {groups.map(({ group, items: groupItems }) => (
            <React.Fragment key={group}>
              <li className="pal-group">{group}</li>
              {groupItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <li key={item.id}>
                    <button type="button" onClick={() => go(item.href)}>
                      {ItemIcon && <ItemIcon className="i sm" stroke={1.75} />}
                      {item.label}
                      {item.sub && <small>{item.sub}</small>}
                    </button>
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </ul>
      </HubDialog>
    </>
  );
}

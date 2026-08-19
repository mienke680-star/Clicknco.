"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { SearchResult } from "@/app/api/search/route";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const handle = setTimeout(() => {
      setLoading(true);
      apiFetch<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => setResults(res.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search…"
          className="h-9 w-full rounded-xl border border-navy-100 bg-navy-50/60 pl-9 pr-3 text-sm text-navy-800 placeholder:text-navy-300 focus:border-coral-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral-400"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-navy-300" />}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-navy-100 bg-white shadow-[var(--shadow-pop)] scrollbar-thin">
          {results.length === 0 && !loading ? (
            <p className="px-4 py-6 text-center text-sm text-navy-400">No results for &ldquo;{query}&rdquo;.</p>
          ) : (
            results.map((r) => (
              <a
                key={`${r.type}-${r.id}`}
                href={r.href}
                className={cn(
                  "flex items-center justify-between gap-3 border-b border-navy-50 px-4 py-2.5 text-sm last:border-0 hover:bg-navy-50",
                )}
              >
                <span>
                  <span className="font-medium text-navy-900">{r.title || "Untitled"}</span>
                  {r.subtitle && <span className="ml-2 text-navy-400">{r.subtitle}</span>}
                </span>
                <span className="shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-400">
                  {r.type}
                </span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

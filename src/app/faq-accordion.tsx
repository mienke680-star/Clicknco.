"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FaqAccordion({ items }: { items: { id: string; question: string; answer: string }[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="mx-auto max-w-2xl divide-y divide-navy-100 rounded-2xl border border-navy-100 bg-white">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <button
              onClick={() => setOpenId(open ? null : item.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={open}
            >
              <span className="text-sm font-semibold text-navy-900">{item.question}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-navy-400 transition-transform", open && "rotate-180")} />
            </button>
            {open && <p className="px-5 pb-4 text-sm leading-relaxed text-navy-500">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({ navItems }: { navItems: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 cursor-pointer"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-navy-100 bg-white px-4 py-3 shadow-[var(--shadow-pop)]">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50">
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-coral-600 hover:bg-coral-50">
                Client Login
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

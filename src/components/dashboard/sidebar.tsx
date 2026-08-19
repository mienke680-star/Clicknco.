"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-types";

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/portal") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    const key = item.group ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
      {Array.from(groups.entries()).map(([group, groupItems]) => (
        <div key={group || "_"} className="mb-4">
          {group && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-400">{group}</p>
          )}
          <ul className="space-y-0.5">
            {groupItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-coral-500 text-white" : "text-navy-200 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <DynamicIcon
                      name={item.icon}
                      className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-navy-400 group-hover:text-white")}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

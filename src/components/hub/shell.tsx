"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMoon, IconSun, IconMenu2 } from "@tabler/icons-react";
import { HUB_NAV, type HubNavItem } from "@/lib/clickco/hub-nav";
import { HubDialog } from "@/components/hub/dialog";
import { CommandPalette, type PaletteItem } from "@/components/hub/command-palette";
import { initials } from "@/lib/utils";

const THEME_KEY = "clickco-theme";
type Theme = "light" | "dark";

function isActive(item: HubNavItem, pathname: string) {
  return item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
}

// Synced via useSyncExternalStore rather than effect+setState: a same-tab
// localStorage write doesn't fire the "storage" event, so writers also call
// notifyThemeListeners() directly to wake this tab's own subscribers.
const themeListeners = new Set<() => void>();
function notifyThemeListeners() {
  themeListeners.forEach((cb) => cb());
}
function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}
function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}
function getStoredThemeServerSnapshot() {
  return null;
}
function setStoredTheme(value: Theme) {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    // private mode / blocked storage -- theme just won't persist across visits
  }
  notifyThemeListeners();
}

function subscribeSystemDark(callback: () => void) {
  const mql = matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
function getSystemDark() {
  return matchMedia("(prefers-color-scheme: dark)").matches;
}
function getSystemDarkServerSnapshot() {
  return false;
}

export interface HubShellProps {
  /** Plain string keys from the server (permission-filtered) -- HUB_NAV's
   * icon component references can't cross the server/client boundary as
   * props, so the full nav items are reconstructed here instead. */
  visibleNavKeys: string[];
  badges?: Record<string, number>;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function HubShell({ visibleNavKeys, badges = {}, userName, userEmail, children }: HubShellProps) {
  const pathname = usePathname();
  const shellRef = React.useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const navItems: HubNavItem[] = React.useMemo(
    () => HUB_NAV.filter((item) => visibleNavKeys.includes(item.key)),
    [visibleNavKeys],
  );
  const paletteItems: PaletteItem[] = React.useMemo(
    () => navItems.map((item) => ({ id: `nav-${item.key}`, label: item.label, group: "Go to", href: item.href, icon: item.icon })),
    [navItems],
  );

  const storedTheme = React.useSyncExternalStore(subscribeTheme, getStoredTheme, getStoredThemeServerSnapshot);
  const systemPrefersDark = React.useSyncExternalStore(subscribeSystemDark, getSystemDark, getSystemDarkServerSnapshot);
  const isDark = storedTheme === "dark" || (storedTheme === null && systemPrefersDark);

  React.useEffect(() => {
    if (storedTheme) {
      shellRef.current?.setAttribute("data-theme", storedTheme);
    } else {
      shellRef.current?.removeAttribute("data-theme");
    }
  }, [storedTheme]);

  function toggleTheme() {
    setStoredTheme(isDark ? "light" : "dark");
  }
  const tabItems = navItems.filter((i) => i.tab);
  const moreItems = navItems.filter((i) => !i.tab);

  return (
    <div className="hub-shell" ref={shellRef} suppressHydrationWarning>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('" + THEME_KEY + "');if(t)document.currentScript.parentElement.setAttribute('data-theme',t);}catch(e){}",
        }}
      />
      <div className="app">
        <aside className="rail" aria-label="Main">
          <Link href="/portal" className="brand" aria-label="Click and Co, go to Today">
            <img src="/brand/logo-mark.png" alt="" width={44} height={48} />
            <span>
              <b>
                CLICK<i>&amp;co.</i>
              </b>
              <small>Operations hub</small>
            </span>
          </Link>
          <div className="rail-label">Workspace</div>
          <nav>
            {navItems.map((item) => {
              const active = isActive(item, pathname);
              const badge = badges[item.key] ?? 0;
              const ItemIcon = item.icon;
              return (
                <Link key={item.key} href={item.href} className="nav-btn" aria-current={active ? "page" : undefined}>
                  <ItemIcon className="i" stroke={1.75} />
                  {item.label}
                  {badge > 0 && <span className="badge">{badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="rail-foot">
            <div className="who">
              <div className="avatar">{initials(userName)}</div>
              <div>
                <b>{userName}</b>
                <small>{userEmail}</small>
              </div>
            </div>
            <button type="button" className="theme-btn" onClick={toggleTheme} data-theme-label>
              {isDark ? <IconSun className="i sm" stroke={1.75} /> : <IconMoon className="i sm" stroke={1.75} />}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <Link href="/portal" className="m-brand" aria-label="Go to Today">
              <img src="/brand/logo-mark.png" alt="" width={30} height={33} />
              CLICK<i>&amp;co.</i>
            </Link>
            <CommandPalette items={paletteItems} />
            <div className="top-actions">
              <button type="button" className="icon-btn top-theme" onClick={toggleTheme} aria-label="Toggle theme">
                {isDark ? <IconSun className="i" stroke={1.75} /> : <IconMoon className="i" stroke={1.75} />}
              </button>
            </div>
          </header>
          <div className="content">{children}</div>
        </div>
      </div>

      <nav className="tabbar" aria-label="Main">
        {tabItems.map((item) => {
          const active = isActive(item, pathname);
          const badge = badges[item.key] ?? 0;
          const ItemIcon = item.icon;
          return (
            <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined}>
              <ItemIcon className="i" stroke={1.75} />
              {item.label}
              {badge > 0 && <span className="badge">{badge}</span>}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)}>
          <IconMenu2 className="i" stroke={1.75} />
          More
        </button>
      </nav>

      <HubDialog open={moreOpen} onClose={() => setMoreOpen(false)} className="more-sheet">
        <nav>
          {moreItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link key={item.key} href={item.href} className="nav-btn" onClick={() => setMoreOpen(false)}>
                <ItemIcon className="i" stroke={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </HubDialog>
    </div>
  );
}

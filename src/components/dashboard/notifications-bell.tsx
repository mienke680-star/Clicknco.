"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownMenu } from "@/components/ui/dropdown";
import { apiFetch, apiPost, hardNavigate } from "@/lib/api-client";
import { timeAgo, cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: NotificationItem[]; unreadCount: number }>("/api/notifications");
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // Non-fatal — the bell just stays quiet if this fails.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const interval = setInterval(load, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [load]);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    await apiPost("/api/notifications/read-all").catch(() => {});
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await apiPost(`/api/notifications/${id}/read`).catch(() => {});
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          type="button"
          onClick={load}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-navy-500 hover:bg-navy-50 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-coral-500" />
          )}
        </button>
      </DropdownTrigger>
      <DropdownMenu className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
          <p className="text-sm font-semibold text-navy-900">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-coral-600 hover:underline cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {!loaded ? (
            <p className="px-4 py-8 text-center text-sm text-navy-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-navy-400">You&apos;re all caught up.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.readAt) markRead(n.id);
                  if (n.link) hardNavigate(n.link);
                }}
                className={cn(
                  "block w-full border-b border-navy-50 px-4 py-3 text-left last:border-0 hover:bg-navy-50 cursor-pointer",
                  !n.readAt && "bg-coral-50/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-navy-900">{n.title}</p>
                  {!n.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />}
                </div>
                {n.body && <p className="mt-0.5 text-xs text-navy-400">{n.body}</p>}
                <p className="mt-1 text-[11px] text-navy-300">{timeAgo(n.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </DropdownMenu>
    </Dropdown>
  );
}

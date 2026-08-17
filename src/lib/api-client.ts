"use client";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * fetch() wrapper that attaches the CSRF header (double-submit cookie) on
 * every mutating request and throws ApiError with the server's message on
 * non-2xx responses, so callers can just `await apiFetch(...)`.
 */
export async function apiFetch<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCookie("cco_csrf");
    if (csrf) headers.set("x-csrf-token", csrf);
    if (init.body && !headers.has("Content-Type") && typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(url, { ...init, headers, credentials: "same-origin" });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError((data && (data as { error?: string }).error) || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export function apiPost<T = unknown>(url: string, body?: unknown) {
  return apiFetch<T>(url, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiPatch<T = unknown>(url: string, body?: unknown) {
  return apiFetch<T>(url, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiDelete<T = unknown>(url: string) {
  return apiFetch<T>(url, { method: "DELETE" });
}

/**
 * Full page navigation, used only for auth transitions (login/logout/2FA/
 * switch-company/accept-invite). These just changed an httpOnly session
 * cookie via a raw fetch() response, not a Server Action — a client-side
 * router.push() can leave server components rendering against stale RSC
 * cache for a beat. A hard navigation guarantees every server component
 * re-renders against the new session, which matters more here than the
 * usual SPA-navigation speed win.
 */
export function hardNavigate(url: string) {
  window.location.href = url;
}

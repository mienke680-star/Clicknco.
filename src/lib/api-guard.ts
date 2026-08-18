import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { loadCompanyContext, type PermissionAction, type CompanyContext } from "@/lib/auth/rbac";
import { getSessionContext, verifyCsrf, type SessionWithUser } from "@/lib/auth/session";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export type CompanyApiContext = CompanyContext & {
  company: NonNullable<CompanyContext["company"]>;
};

interface Options {
  /** Set false for read-only endpoints to skip the CSRF check. Default: inferred from HTTP method. */
  mutate?: boolean;
  /** Module key + action this request requires (checked via ctx.can()). */
  module?: string;
  action?: PermissionAction;
}

/**
 * Standard guard for company-scoped API routes: validates the session, resolves
 * the caller's active company + permissions, checks CSRF on mutating requests,
 * and applies a per-user rate limit. Returns either the resolved context or a
 * ready-to-return NextResponse error.
 */
export async function requireApiCompanyContext(
  req: NextRequest,
  opts: Options = {},
): Promise<CompanyApiContext | NextResponse> {
  const mutate = opts.mutate ?? req.method !== "GET";

  const ctx = await loadCompanyContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.company) {
    return NextResponse.json({ error: "No active company" }, { status: 403 });
  }

  const rl = rateLimit(`api:${ctx.user.id}`, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (mutate) {
    const csrfHeader = req.headers.get("x-csrf-token");
    if (!(await verifyCsrf(csrfHeader))) {
      return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
    }
  }

  if (opts.module && opts.action && !ctx.can(opts.module, opts.action)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return ctx as CompanyApiContext;
}

export function isApiError(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Guard for platform-level Super-Admin-only API routes that aren't scoped to
 * the caller's *active* company (e.g. /api/admin/companies — the Super Admin
 * manages a company there without needing to have entered it first).
 */
export async function requireApiSuperAdmin(
  req: NextRequest,
  opts: { mutate?: boolean } = {},
): Promise<NonNullable<SessionWithUser> | NextResponse> {
  const mutate = opts.mutate ?? req.method !== "GET";

  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`api:${session.user.id}`, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (mutate) {
    const csrfHeader = req.headers.get("x-csrf-token");
    if (!(await verifyCsrf(csrfHeader))) {
      return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
    }
  }

  return session as NonNullable<SessionWithUser>;
}

/** Rate limit helper for unauthenticated public endpoints (public form submissions, tracking). */
export function publicWriteRateLimit(req: NextRequest, bucket = "public") {
  const ip = clientIp(req);
  return rateLimit(`${bucket}:${ip}`, RATE_LIMITS.publicWrite.limit, RATE_LIMITS.publicWrite.windowMs);
}

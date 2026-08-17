import "server-only";

/**
 * In-memory sliding-window rate limiter. Good enough for a single-instance
 * deployment / this environment. For a multi-instance production deployment,
 * swap the Map below for a shared store (Redis/Upstash) behind this same
 * function signature — nothing else in the app needs to change.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  signup: { limit: 6, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 15 * 60 * 1000 },
  twoFactor: { limit: 8, windowMs: 15 * 60 * 1000 },
  api: { limit: 240, windowMs: 60 * 1000 },
  publicWrite: { limit: 30, windowMs: 60 * 1000 },
} as const;

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

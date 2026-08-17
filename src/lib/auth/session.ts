import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/crypto";

export const SESSION_COOKIE = "cco_session";
export const CSRF_COOKIE = "cco_csrf";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // renew once under 15 days left

const isProd = process.env.NODE_ENV === "production";

export interface NewSessionOptions {
  activeCompanyId?: string | null;
  impersonatedByUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Creates a DB-backed session and sets the httpOnly session cookie + a readable CSRF cookie. */
export async function createSession(userId: string, opts: NewSessionOptions = {}) {
  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      activeCompanyId: opts.activeCompanyId ?? null,
      impersonatedByUserId: opts.impersonatedByUserId ?? null,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  const { token: csrfToken } = generateToken(16);
  cookieStore.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export type SessionWithUser = Awaited<ReturnType<typeof loadSession>>;

async function loadSession(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

/** Reads + validates the session from cookies. Returns null if absent/expired/revoked. */
export async function getSessionContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const hash = hashToken(token);
  const session = await loadSession(hash);
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.status === "SUSPENDED") return null;

  if (session.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt } }).catch(() => {});
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  }

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function setActiveCompany(sessionId: string, companyId: string) {
  await prisma.session.update({ where: { id: sessionId }, data: { activeCompanyId: companyId } });
}

/** Verifies the double-submit CSRF token for state-changing requests. */
export async function verifyCsrf(headerToken: string | null) {
  if (!headerToken) return false;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;
  return cookieToken === headerToken;
}

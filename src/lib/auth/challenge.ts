import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

export const CHALLENGE_COOKIE = "cco_2fa_challenge";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET!;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Short-lived, stateless "who's mid-login" marker used between password
 * verification and the 2FA code prompt. Not a session — it grants no access
 * by itself, it only remembers which user still needs to pass their second
 * factor. Signed with HMAC so it can't be forged or edited client-side.
 */
export async function createTwoFactorChallenge(userId: string, method: "TOTP" | "EMAIL") {
  const payload = JSON.stringify({ userId, method, exp: Date.now() + TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = sign(encoded);
  const value = `${encoded}.${sig}`;

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return value;
}

export async function readTwoFactorChallenge(): Promise<{ userId: string; method: "TOTP" | "EMAIL" } | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CHALLENGE_COOKIE)?.value;
  if (!value) return null;
  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) return null;
  if (sign(encoded) !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { userId: payload.userId, method: payload.method };
  } catch {
    return null;
  }
}

export async function clearTwoFactorChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(CHALLENGE_COOKIE);
}

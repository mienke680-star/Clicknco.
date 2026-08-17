import crypto from "crypto";

/**
 * AES-256-GCM helpers for encrypting sensitive values at rest (integration
 * secrets, 2FA seeds). Key comes from ENCRYPTION_KEY (32 random bytes,
 * base64) which must never be exposed to the client.
 */
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  return key;
}

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/** Generates a URL-safe random token and its SHA-256 hash for DB storage. */
export function generateToken(bytes = 32) {
  const token = crypto.randomBytes(bytes).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** 6-digit numeric code for email 2FA / verification, plus its hash. */
export function generateNumericCode() {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { code, hash: hashToken(code) };
}

export function randomId(prefix: string, bytes = 16) {
  return `${prefix}_${crypto.randomBytes(bytes).toString("hex")}`;
}

export function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

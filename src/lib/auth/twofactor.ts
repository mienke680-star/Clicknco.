import "server-only";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret() {
  return generateSecret();
}

export function getTotpUri(email: string, secret: string) {
  return generateURI({ issuer: "Click & Co", label: email, secret });
}

export async function getTotpQrCodeDataUrl(uri: string) {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export async function verifyTotp(token: string, secret: string) {
  try {
    const result = await verify({ secret, token, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

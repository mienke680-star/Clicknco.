import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Sends mail via SMTP when configured. With no SMTP_HOST set (default in this
 * environment), the message is logged to the server console instead — every
 * email-driven flow (verification, reset, campaigns, notifications) still
 * runs its real logic end to end, it just doesn't leave the sandbox.
 */
export async function sendMail(input: SendMailInput) {
  const from = input.from || process.env.SMTP_FROM || "Click & Co <hello@clickandco.app>";
  const t = getTransporter();

  if (!t) {
    console.log(
      `\n----- [DEV MAIL — no SMTP configured] -----\nTo: ${input.to}\nFrom: ${from}\nSubject: ${input.subject}\n\n${input.text || stripHtml(input.html)}\n--------------------------------------------\n`,
    );
    return { delivered: false, dev: true as const };
  }

  try {
    const info = await t.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || stripHtml(input.html),
      replyTo: input.replyTo,
    });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error("sendMail failed:", err);
    return { delivered: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

const APP_URL = process.env.APP_URL || "http://localhost:3000";

function shell(opts: { preheader?: string; title: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:#FAF9F6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
    ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F6;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(19,34,56,0.08);">
          <tr><td style="background:#132238;padding:24px 32px;">
            <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Click <span style="color:#FF7657;">&amp;</span> Co</span>
          </td></tr>
          <tr><td style="padding:32px;color:#252525;font-size:15px;line-height:1.6;">
            <h1 style="margin:0 0 16px;font-size:20px;color:#132238;">${opts.title}</h1>
            ${opts.bodyHtml}
            ${
              opts.ctaLabel && opts.ctaUrl
                ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                    <tr><td style="background:#FF7657;border-radius:10px;">
                      <a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 24px;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;border-radius:10px;">${opts.ctaLabel}</a>
                    </td></tr>
                  </table>`
                : ""
            }
          </td></tr>
          <tr><td style="padding:20px 32px;background:#FAF9F6;color:#8CA1BB;font-size:12px;">
            Click &amp; Co · Everything your online business needs, one simple platform.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function verifyEmailTemplate(name: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  return {
    subject: "Confirm your email for Click & Co",
    html: shell({
      title: `Welcome, ${name.split(" ")[0]}`,
      preheader: "Confirm your email to activate your Click & Co workspace.",
      bodyHtml: `<p>Thanks for creating your Click & Co workspace. Confirm your email address to activate your account and get started.</p><p style="color:#5D7594;font-size:13px;">This link expires in 24 hours.</p>`,
      ctaLabel: "Confirm email address",
      ctaUrl: url,
    }),
  };
}

export function resetPasswordTemplate(name: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return {
    subject: "Reset your Click & Co password",
    html: shell({
      title: `Reset your password`,
      preheader: "Reset your Click & Co password.",
      bodyHtml: `<p>Hi ${name.split(" ")[0]}, we received a request to reset your Click & Co password. If this wasn't you, you can safely ignore this email.</p><p style="color:#5D7594;font-size:13px;">This link expires in 1 hour.</p>`,
      ctaLabel: "Reset password",
      ctaUrl: url,
    }),
  };
}

export function twoFactorCodeTemplate(code: string) {
  return {
    subject: `${code} is your Click & Co verification code`,
    html: shell({
      title: "Your verification code",
      preheader: `Your code is ${code}`,
      bodyHtml: `<p>Enter this code to finish signing in:</p><p style="font-size:32px;font-weight:700;letter-spacing:0.15em;color:#132238;text-align:center;margin:24px 0;">${code}</p><p style="color:#5D7594;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    }),
  };
}

export function teamInviteTemplate(orgName: string, inviterName: string, token: string) {
  const url = `${APP_URL}/accept-invite?token=${token}`;
  return {
    subject: `${inviterName} invited you to join ${orgName} on Click & Co`,
    html: shell({
      title: `You're invited to ${orgName}`,
      preheader: `${inviterName} invited you to join ${orgName} on Click & Co.`,
      bodyHtml: `<p>${inviterName} has invited you to join <strong>${orgName}</strong>'s workspace on Click &amp; Co.</p>`,
      ctaLabel: "Accept invitation",
      ctaUrl: url,
    }),
  };
}

export function passwordChangedTemplate(name: string) {
  return {
    subject: "Your Click & Co password was changed",
    html: shell({
      title: "Password changed",
      bodyHtml: `<p>Hi ${name.split(" ")[0]}, this confirms your Click & Co password was just changed. If you didn't make this change, contact support immediately and reset your password.</p>`,
    }),
  };
}

export function genericNotificationTemplate(title: string, message: string, ctaLabel?: string, ctaUrl?: string) {
  return {
    subject: title,
    html: shell({ title, bodyHtml: `<p>${message}</p>`, ctaLabel, ctaUrl }),
  };
}

export function bookingConfirmationTemplate(opts: {
  contactName: string;
  appointmentName: string;
  startsAt: Date;
  timezone: string;
  cancelUrl?: string;
}) {
  const when = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: opts.timezone,
  }).format(opts.startsAt);
  return {
    subject: `Confirmed: ${opts.appointmentName}`,
    html: shell({
      title: "Booking confirmed",
      bodyHtml: `<p>Hi ${opts.contactName.split(" ")[0]}, your booking is confirmed.</p><p style="background:#FFE7DE;border-radius:10px;padding:16px;color:#132238;"><strong>${opts.appointmentName}</strong><br/>${when} (${opts.timezone})</p>`,
      ctaLabel: opts.cancelUrl ? "Manage booking" : undefined,
      ctaUrl: opts.cancelUrl,
    }),
  };
}

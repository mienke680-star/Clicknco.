import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicWriteRateLimit } from "@/lib/api-guard";
import { publicInquirySchema } from "@/lib/validation/site";
import { sendMail } from "@/lib/mail/mailer";
import { genericNotificationTemplate } from "@/lib/mail/templates";

/** Public "Request Your System" contact form — no auth, rate-limited by IP. */
export async function POST(req: NextRequest) {
  const rl = publicWriteRateLimit(req, "inquiries");
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = publicInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your details and try again." }, { status: 400 });
  }
  if (parsed.data.website) {
    // Honeypot tripped — pretend success so bots don't learn anything, but don't store it.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const inquiry = await prisma.platformInquiry.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      message: parsed.data.message || null,
    },
  });

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (superAdminEmail) {
    const tpl = genericNotificationTemplate(
      `New inquiry from ${parsed.data.name}`,
      `${parsed.data.company ? `${parsed.data.company} — ` : ""}${parsed.data.email}${parsed.data.phone ? ` · ${parsed.data.phone}` : ""}${parsed.data.message ? `\n\n"${parsed.data.message}"` : ""}`,
      "View in Click & Co",
      `${process.env.APP_URL || "http://localhost:3000"}/admin/inquiries`,
    );
    await sendMail({ to: superAdminEmail, subject: tpl.subject, html: tpl.html });
  }

  return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
}

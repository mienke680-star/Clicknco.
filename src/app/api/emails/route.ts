import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { sendEmailSchema } from "@/lib/validation/emails";
import { assertContactInCompany } from "@/lib/tenant-refs";
import { applyMergeFields } from "@/lib/mail/merge";
import { sendMail } from "@/lib/mail/mailer";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "emails", action: "view" });
  if (isApiError(ctx)) return ctx;

  const sp = req.nextUrl.searchParams;
  const contactId = sp.get("contactId") || undefined;
  const offset = Math.max(0, Number(sp.get("offset")) || 0);
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));

  const where = { companyId: ctx.company.id, ...(contactId ? { contactId } : {}) };
  const [messages, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.emailMessage.count({ where }),
  ]);

  return NextResponse.json({ messages, total, hasMore: offset + messages.length < total });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "emails", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const refError = await assertContactInCompany(ctx.company.id, parsed.data.contactId);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const contact = await prisma.contact.findUnique({ where: { id: parsed.data.contactId } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (!contact.email) return NextResponse.json({ error: "This contact has no email address on file." }, { status: 400 });

  const subject = applyMergeFields(parsed.data.subject, contact);
  const htmlBody = applyMergeFields(parsed.data.body, contact);

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const isFuture = scheduledAt && scheduledAt.getTime() > Date.now();

  if (isFuture) {
    const message = await prisma.emailMessage.create({
      data: {
        companyId: ctx.company.id,
        contactId: contact.id,
        toEmail: contact.email,
        subject,
        body: htmlBody,
        status: "QUEUED",
        scheduledAt,
        triggeredBy: "manual",
      },
    });
    return NextResponse.json({ message }, { status: 201 });
  }

  const result = await sendMail({ to: contact.email, subject, html: htmlBody });
  const message = await prisma.emailMessage.create({
    data: {
      companyId: ctx.company.id,
      contactId: contact.id,
      toEmail: contact.email,
      subject,
      body: htmlBody,
      status: result.delivered || result.dev ? "SENT" : "FAILED",
      sentAt: new Date(),
      triggeredBy: "manual",
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "email.sent", targetType: "EmailMessage", targetId: message.id, metadata: { to: contact.email }, ip, userAgent });

  return NextResponse.json({ message }, { status: 201 });
}

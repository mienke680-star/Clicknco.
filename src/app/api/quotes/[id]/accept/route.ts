import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getQuoteById } from "@/lib/clickco/quotes";
import { nextInvoiceNumber } from "@/lib/clickco/invoices";
import { toPackageDTO } from "@/lib/clickco/packages";
import { depositInvoiceAmount, depositInvoiceDescription } from "@/lib/clickco/quote-calc";
import { defaultMilestonesFor } from "@/lib/clickco/milestones";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "approve" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.quote.findFirst({ where: { id, companyId: ctx.company.id }, include: { package: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["SENT", "VIEWED"].includes(existing.status)) {
    return NextResponse.json({ error: "Only a sent or viewed quote can be accepted." }, { status: 400 });
  }

  const pkg = toPackageDTO(existing.package);
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + (pkg.billing === "MONTHLY" ? 30 : 28));
  const invoiceDue = new Date(now);
  invoiceDue.setDate(invoiceDue.getDate() + 7);

  const { project, invoice } = await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id }, data: { status: "ACCEPTED" } });
    await tx.contact.update({
      where: { id: existing.contactId },
      data: { status: pkg.billing === "MONTHLY" ? "Retainer" : "Onboarding" },
    });

    const project = await tx.project.create({
      data: {
        companyId: ctx.company.id,
        contactId: existing.contactId,
        packageId: existing.packageId,
        quoteId: id,
        name: pkg.name,
        stage: "ONBOARDING",
        dueDate,
        milestones: { create: defaultMilestonesFor(pkg.category).map((label, i) => ({ label, sortOrder: i })) },
      },
    });

    const invoiceNumber = await nextInvoiceNumber(tx, ctx.company.id);
    const invoice = await tx.invoice.create({
      data: {
        companyId: ctx.company.id,
        contactId: existing.contactId,
        projectId: project.id,
        number: invoiceNumber,
        description: depositInvoiceDescription(pkg, existing.plan),
        amount: depositInvoiceAmount(Number(existing.depositAmount), existing.vatTreatment),
        issuedAt: now,
        dueDate: invoiceDue,
        createdByUserId: ctx.user.id,
      },
    });

    return { project, invoice };
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "quote.accepted", targetType: "Quote", targetId: id, ip, userAgent });
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "project.created", targetType: "Project", targetId: project.id, metadata: { quoteId: id }, ip, userAgent });
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "invoice.created", targetType: "Invoice", targetId: invoice.id, metadata: { quoteId: id, projectId: project.id }, ip, userAgent });

  const full = await getQuoteById(ctx.company.id, id);
  return NextResponse.json({ quote: full, projectId: project.id, invoiceId: invoice.id });
}

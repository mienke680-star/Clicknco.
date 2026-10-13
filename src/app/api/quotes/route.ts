import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { quoteInputSchema } from "@/lib/validation/clickco";
import { assertContactInCompany, assertPackageInCompany } from "@/lib/tenant-refs";
import { getQuotes, getQuoteById, nextQuoteNumber } from "@/lib/clickco/quotes";
import { toPackageDTO, toAddonDTO } from "@/lib/clickco/packages";
import { quoteCalc } from "@/lib/clickco/quote-calc";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "view" });
  if (isApiError(ctx)) return ctx;

  const quotes = await getQuotes(ctx.company.id);
  return NextResponse.json({ quotes });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = quoteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { contactId, packageId, plan, addonIds, notes, send } = parsed.data;

  const refError = (await assertContactInCompany(ctx.company.id, contactId)) ?? (await assertPackageInCompany(ctx.company.id, packageId));
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const [packageRow, addonRows, businessSettings] = await Promise.all([
    prisma.package.findFirst({ where: { id: packageId, companyId: ctx.company.id } }),
    prisma.addon.findMany({ where: { id: { in: addonIds }, companyId: ctx.company.id } }),
    prisma.businessSettings.upsert({ where: { companyId: ctx.company.id }, update: {}, create: { companyId: ctx.company.id } }),
  ]);
  if (!packageRow) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const pkg = toPackageDTO(packageRow);
  const addons = addonRows.map(toAddonDTO);
  const calc = quoteCalc(pkg, plan, addons, businessSettings.vatTreatment);

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 14);

  const quote = await prisma.$transaction(async (tx) => {
    const number = await nextQuoteNumber(tx, ctx.company.id);
    return tx.quote.create({
      data: {
        companyId: ctx.company.id,
        number,
        contactId,
        packageId,
        plan,
        notes: notes || null,
        status: send ? "SENT" : "DRAFT",
        issuedAt: now,
        validUntil,
        vatTreatment: businessSettings.vatTreatment,
        subtotal: calc.subtotal,
        vatAmount: calc.vatAmount,
        total: calc.total,
        monthlyTotal: calc.monthlyTotal,
        depositAmount: calc.depositAmount,
        createdByUserId: ctx.user.id,
        lineItems: { create: calc.lines.map((l, i) => ({ label: l.label, description: l.sub, amount: l.amount, recurring: l.recurring, sortOrder: i })) },
      },
    });
  });

  if (send) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (contact?.status === "Lead") {
      await prisma.contact.update({ where: { id: contactId }, data: { status: "Quoted" } });
    }
  }

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "quote.created", targetType: "Quote", targetId: quote.id, ip, userAgent });
  if (send) {
    await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "quote.sent", targetType: "Quote", targetId: quote.id, ip, userAgent });
  }

  const full = await getQuoteById(ctx.company.id, quote.id);
  return NextResponse.json({ quote: full });
}

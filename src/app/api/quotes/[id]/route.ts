import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { quoteInputSchema } from "@/lib/validation/clickco";
import { assertPackageInCompany } from "@/lib/tenant-refs";
import { getQuoteById } from "@/lib/clickco/quotes";
import { toPackageDTO, toAddonDTO } from "@/lib/clickco/packages";
import { quoteCalc } from "@/lib/clickco/quote-calc";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const quote = await getQuoteById(ctx.company.id, id);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ quote });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "quotes", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.quote.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["DRAFT", "SENT", "VIEWED"].includes(existing.status)) {
    return NextResponse.json({ error: "This quote can no longer be edited." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = quoteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { packageId, plan, addonIds, notes, send } = parsed.data;

  const refError = await assertPackageInCompany(ctx.company.id, packageId);
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
  const newStatus = send && existing.status === "DRAFT" ? "SENT" : existing.status;

  await prisma.$transaction([
    prisma.quoteLineItem.deleteMany({ where: { quoteId: id } }),
    prisma.quote.update({
      where: { id },
      data: {
        packageId,
        plan,
        notes: notes || null,
        status: newStatus,
        vatTreatment: businessSettings.vatTreatment,
        subtotal: calc.subtotal,
        vatAmount: calc.vatAmount,
        total: calc.total,
        monthlyTotal: calc.monthlyTotal,
        depositAmount: calc.depositAmount,
        lineItems: { create: calc.lines.map((l, i) => ({ label: l.label, description: l.sub, amount: l.amount, recurring: l.recurring, sortOrder: i })) },
      },
    }),
  ]);

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "quote.updated", targetType: "Quote", targetId: id, ip, userAgent });

  const full = await getQuoteById(ctx.company.id, id);
  return NextResponse.json({ quote: full });
}

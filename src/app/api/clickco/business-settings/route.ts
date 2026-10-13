import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { businessSettingsSchema } from "@/lib/validation/clickco";
import { writeAuditLog, requestMeta } from "@/lib/audit";

/** Lazily creates the row on first read rather than at company provisioning,
 * so a brand-new company's go-live checklist starts "not configured yet". */
async function getOrCreateBusinessSettings(companyId: string) {
  return prisma.businessSettings.upsert({
    where: { companyId },
    update: {},
    create: { companyId },
  });
}

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "business_settings", action: "view" });
  if (isApiError(ctx)) return ctx;

  const settings = await getOrCreateBusinessSettings(ctx.company.id);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "business_settings", action: "edit" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = businessSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  await getOrCreateBusinessSettings(ctx.company.id);

  const data = parsed.data;
  const settings = await prisma.businessSettings.update({
    where: { companyId: ctx.company.id },
    data: {
      tradingName: data.tradingName || null,
      ownerName: data.ownerName || null,
      email: data.email || null,
      phone: data.phone || null,
      registrationNumber: data.registrationNumber || null,
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      branchCode: data.branchCode || null,
      ...(data.vatTreatment !== undefined && { vatTreatment: data.vatTreatment }),
      ...(data.nextQuoteNumber !== undefined && { nextQuoteNumber: data.nextQuoteNumber }),
      ...(data.nextInvoiceNumber !== undefined && { nextInvoiceNumber: data.nextInvoiceNumber }),
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "businesssettings.updated",
    targetType: "BusinessSettings",
    targetId: settings.id,
    ip,
    userAgent,
  });

  return NextResponse.json({ settings });
}

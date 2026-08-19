import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { writeAuditLog, requestMeta } from "@/lib/audit";

function pick(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (rowKey.trim().toLowerCase() === key) return row[rowKey]?.trim() ?? "";
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "contacts", action: "create" });
  if (isApiError(ctx)) return ctx;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Attach a CSV file." }, { status: 400 });
  }
  const text = await file.text();

  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json({ error: "Couldn't read that CSV file." }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of parsed.data.slice(0, 2000)) {
    const firstName = pick(row, ["first name", "firstname"]);
    const email = pick(row, ["email"]).toLowerCase();
    if (!firstName && !email) {
      skipped++;
      continue;
    }

    const data = {
      firstName: firstName || email.split("@")[0] || "Unknown",
      lastName: pick(row, ["last name", "lastname"]) || null,
      email: email || null,
      phone: pick(row, ["phone", "phone number"]) || null,
      company: pick(row, ["company"]) || null,
      address: pick(row, ["address"]) || null,
      leadSource: pick(row, ["lead source", "source"]) || "CSV Import",
      status: pick(row, ["status"]) || "Lead",
    };

    if (email) {
      const existing = await prisma.contact.findUnique({ where: { companyId_email: { companyId: ctx.company.id, email } } });
      if (existing) {
        await prisma.contact.update({ where: { id: existing.id }, data });
        updated++;
        continue;
      }
    }

    await prisma.contact.create({ data: { companyId: ctx.company.id, ...data } });
    created++;
  }

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({
    companyId: ctx.company.id,
    actorUserId: ctx.user.id,
    action: "contact.imported",
    metadata: { created, updated, skipped },
    ip,
    userAgent,
  });

  return NextResponse.json({ created, updated, skipped });
}

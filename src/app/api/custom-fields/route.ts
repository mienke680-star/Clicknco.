import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { customFieldSchema } from "@/lib/validation/contacts";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "contacts", action: "view" });
  if (isApiError(ctx)) return ctx;

  const customFields = await prisma.customField.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ customFields });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "settings", action: "settings" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = customFieldSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const existing = await prisma.customField.findUnique({
    where: { companyId_key: { companyId: ctx.company.id, key: parsed.data.key } },
  });
  if (existing) return NextResponse.json({ error: "A custom field with that key already exists." }, { status: 409 });

  const customField = await prisma.customField.create({
    data: {
      companyId: ctx.company.id,
      key: parsed.data.key,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.options ? { choices: parsed.data.options } : undefined,
    },
  });
  return NextResponse.json({ customField }, { status: 201 });
}

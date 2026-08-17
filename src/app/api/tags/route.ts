import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { tagSchema } from "@/lib/validation/contacts";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "contacts", action: "view" });
  if (isApiError(ctx)) return ctx;

  const tags = await prisma.tag.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } });
  return NextResponse.json({ tags });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "contacts", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const existing = await prisma.tag.findUnique({ where: { companyId_name: { companyId: ctx.company.id, name: parsed.data.name } } });
  if (existing) return NextResponse.json({ tag: existing });

  const tag = await prisma.tag.create({
    data: { companyId: ctx.company.id, name: parsed.data.name, color: parsed.data.color || "#132238" },
  });
  return NextResponse.json({ tag }, { status: 201 });
}

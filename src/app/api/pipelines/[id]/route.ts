import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const pipeline = await prisma.pipeline.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const updated = await prisma.pipeline.update({ where: { id }, data: { name } });
  return NextResponse.json({ pipeline: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "pipelines", action: "delete" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const pipeline = await prisma.pipeline.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.pipeline.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

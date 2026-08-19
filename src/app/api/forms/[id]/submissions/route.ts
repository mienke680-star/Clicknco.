import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "forms", action: "view" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const form = await prisma.form.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const offset = Math.max(0, Number(sp.get("offset")) || 0);
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));

  const [submissions, total] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { formId: id },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.formSubmission.count({ where: { formId: id } }),
  ]);

  return NextResponse.json({ submissions, total, hasMore: offset + submissions.length < total });
}

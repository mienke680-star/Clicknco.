import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { projectCreateSchema } from "@/lib/validation/clickco";
import { assertContactInCompany, assertPackageInCompany } from "@/lib/tenant-refs";
import { getProjects, getProjectById } from "@/lib/clickco/projects";
import { defaultMilestonesFor } from "@/lib/clickco/milestones";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "projects", action: "view" });
  if (isApiError(ctx)) return ctx;

  const projects = await getProjects(ctx.company.id);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "projects", action: "create" });
  if (isApiError(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const { contactId, packageId, name, dueDate } = parsed.data;

  const refError = (await assertContactInCompany(ctx.company.id, contactId)) ?? (await assertPackageInCompany(ctx.company.id, packageId));
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const packageRow = await prisma.package.findFirst({ where: { id: packageId, companyId: ctx.company.id } });
  if (!packageRow) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const project = await prisma.project.create({
    data: {
      companyId: ctx.company.id,
      contactId,
      packageId,
      name: name || packageRow.name,
      dueDate: new Date(dueDate),
      milestones: { create: defaultMilestonesFor(packageRow.category).map((label, i) => ({ label, sortOrder: i })) },
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "project.created", targetType: "Project", targetId: project.id, ip, userAgent });

  const full = await getProjectById(ctx.company.id, project.id);
  return NextResponse.json({ project: full });
}

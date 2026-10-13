import "server-only";
import { prisma } from "@/lib/db";
import { toPackageDTO, type PackageDTO } from "@/lib/clickco/packages";
import type { Project, ProjectMilestone, Contact, Package } from "@/generated/prisma/client";

export { projectProgress } from "@/lib/clickco/milestones";

const projectInclude = {
  contact: true,
  package: true,
  milestones: { orderBy: { sortOrder: "asc" as const } },
} as const;

type ProjectRow = Project & { contact: Contact; package: Package; milestones: ProjectMilestone[] };

export type ProjectDTO = Omit<Project, never> & { contact: Contact; package: PackageDTO; milestones: ProjectMilestone[] };

function toProjectDTO(p: ProjectRow): ProjectDTO {
  return { ...p, package: toPackageDTO(p.package) };
}

export async function getProjects(companyId: string): Promise<ProjectDTO[]> {
  const rows = await prisma.project.findMany({ where: { companyId }, include: projectInclude, orderBy: { dueDate: "asc" } });
  return rows.map(toProjectDTO);
}

export async function getProjectById(companyId: string, id: string): Promise<ProjectDTO | null> {
  const row = await prisma.project.findFirst({ where: { id, companyId }, include: projectInclude });
  return row ? toProjectDTO(row) : null;
}

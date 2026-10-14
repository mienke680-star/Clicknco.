import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getProjects } from "@/lib/clickco/projects";
import { getPackages } from "@/lib/clickco/packages";
import { ProjectsClient } from "./projects-client";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [projects, packages, contacts] = await Promise.all([
    getProjects(companyId),
    getPackages(companyId),
    prisma.contact.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return <ProjectsClient projects={projects} packages={packages} contacts={contacts} canCreate={ctx.can("projects", "create")} canEdit={ctx.can("projects", "edit")} />;
}

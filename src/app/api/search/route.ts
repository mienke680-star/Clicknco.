import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadCompanyContext } from "@/lib/auth/rbac";

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

/**
 * Global search, scoped by who's asking: inside a company, results are limited
 * to that company's data; a Super Admin with nothing "entered" searches across
 * companies and platform users instead. Company users never see across-tenant
 * results — there is no query path here that omits the companyId filter.
 */
export async function GET(req: NextRequest) {
  const ctx = await loadCompanyContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results: SearchResult[] = [];

  if (ctx.company) {
    const [contacts, tasks, modules] = await Promise.all([
      prisma.contact.findMany({
        where: {
          companyId: ctx.company.id,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 6,
      }),
      prisma.task.findMany({
        where: { companyId: ctx.company.id, title: { contains: q, mode: "insensitive" } },
        take: 6,
      }),
      prisma.companyModule.findMany({
        where: { companyId: ctx.company.id, kind: "CUSTOM", name: { contains: q, mode: "insensitive" } },
        take: 4,
      }),
    ]);

    for (const c of contacts) {
      results.push({
        type: "Contact",
        id: c.id,
        title: `${c.firstName} ${c.lastName ?? ""}`.trim(),
        subtitle: c.email ?? c.phone ?? undefined,
        href: `/portal/contacts/${c.id}`,
      });
    }
    for (const t of tasks) {
      results.push({ type: "Task", id: t.id, title: t.title, subtitle: t.status, href: `/portal/tasks?open=${t.id}` });
    }
    for (const m of modules) {
      results.push({ type: "Module", id: m.id, title: m.name, href: `/portal/modules/${m.key}` });
    }
  } else if (ctx.isSuperAdmin) {
    const [companies, users] = await Promise.all([
      prisma.company.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: 8,
      }),
      prisma.user.findMany({
        where: {
          OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
        },
        take: 6,
      }),
    ]);

    for (const c of companies) {
      results.push({ type: "Company", id: c.id, title: c.name, subtitle: c.status, href: `/admin/companies/${c.id}` });
    }
    for (const u of users) {
      results.push({ type: "User", id: u.id, title: u.name, subtitle: u.email, href: `/admin/users?q=${u.email}` });
    }
  }

  return NextResponse.json({ results });
}

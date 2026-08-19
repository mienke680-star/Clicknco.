import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";

/** Neutralizes CSV/formula injection (CWE-1236): a leading =, +, -, or @ is
 * how Excel/Sheets/LibreOffice decide a cell is a formula, so a contact field
 * like "=HYPERLINK(...)" would otherwise execute when a teammate opens the
 * exported file. Prefixing with a single quote forces it to be read as text. */
function csvEscape(value: string) {
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "contacts", action: "export" });
  if (isApiError(ctx)) return ctx;

  const contacts = await prisma.contact.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "asc" },
    include: { tags: { include: { tag: true } } },
  });

  const headers = ["First Name", "Last Name", "Email", "Phone", "Company", "Address", "Lead Source", "Status", "Tags", "Created"];
  const rows = contacts.map((c) =>
    [
      c.firstName,
      c.lastName ?? "",
      c.email ?? "",
      c.phone ?? "",
      c.company ?? "",
      c.address ?? "",
      c.leadSource ?? "",
      c.status ?? "",
      c.tags.map((t) => t.tag.name).join("; "),
      c.createdAt.toISOString().slice(0, 10),
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

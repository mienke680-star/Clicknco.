import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { saveFile, UnsupportedFileTypeError } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

/** Generic company-scoped file upload used by module-record FILE/IMAGE fields
 * (and any future feature that just needs "store this file, get a URL back").
 * Requires the target moduleKey so it can be permission-checked the same way
 * the record create/edit routes are — otherwise any authenticated company
 * member (even one with zero create/edit rights anywhere) could write files. */
export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;

  const form = await req.formData().catch(() => null);
  const moduleKey = form?.get("moduleKey");
  if (typeof moduleKey !== "string" || !moduleKey) {
    return NextResponse.json({ error: "moduleKey is required" }, { status: 400 });
  }
  if (!ctx.can(moduleKey, "create") && !ctx.can(moduleKey, "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyModule = await prisma.companyModule.findUnique({ where: { companyId_key: { companyId: ctx.company.id, key: moduleKey } } });
  if (!companyModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (8MB max)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const stored = await saveFile(ctx.company.id, file.name, buffer, file.type || "application/octet-stream");
    return NextResponse.json({ file: stored }, { status: 201 });
  } catch (err) {
    if (err instanceof UnsupportedFileTypeError) {
      return NextResponse.json({ error: "That file type isn't supported. Try an image, PDF, spreadsheet, document, or zip." }, { status: 400 });
    }
    throw err;
  }
}

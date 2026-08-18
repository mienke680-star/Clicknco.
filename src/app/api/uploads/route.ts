import { NextRequest, NextResponse } from "next/server";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { saveFile } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

/** Generic company-scoped file upload used by module-record FILE/IMAGE fields
 * (and any future feature that just needs "store this file, get a URL back"). */
export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req);
  if (isApiError(ctx)) return ctx;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (8MB max)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await saveFile(ctx.company.id, file.name, buffer, file.type || "application/octet-stream");

  return NextResponse.json({ file: stored }, { status: 201 });
}

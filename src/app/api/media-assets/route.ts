import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { saveFile, inferMediaKind, UnsupportedFileTypeError } from "@/lib/storage";
import { assertContactInCompany } from "@/lib/tenant-refs";
import { writeAuditLog, requestMeta } from "@/lib/audit";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { mutate: false, module: "documents", action: "view" });
  if (isApiError(ctx)) return ctx;

  const assets = await prisma.mediaAsset.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    include: {
      relatedContact: { select: { id: true, firstName: true, lastName: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "documents", action: "create" });
  if (isApiError(ctx)) return ctx;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (8MB max)." }, { status: 400 });
  }

  const relatedContactId = form?.get("relatedContactId");
  const contactId = typeof relatedContactId === "string" && relatedContactId ? relatedContactId : null;
  if (contactId) {
    const refError = await assertContactInCompany(ctx.company.id, contactId);
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let stored;
  try {
    stored = await saveFile(ctx.company.id, file.name, buffer, file.type || "application/octet-stream");
  } catch (err) {
    if (err instanceof UnsupportedFileTypeError) {
      return NextResponse.json({ error: "That file type isn't supported. Try an image, PDF, spreadsheet, document, or zip." }, { status: 400 });
    }
    throw err;
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      companyId: ctx.company.id,
      relatedContactId: contactId,
      fileName: stored.fileName,
      url: stored.url,
      kind: inferMediaKind(stored.mimeType),
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      width: stored.width,
      height: stored.height,
      uploadedByUserId: ctx.user.id,
    },
    include: {
      relatedContact: { select: { id: true, firstName: true, lastName: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ companyId: ctx.company.id, actorUserId: ctx.user.id, action: "document.uploaded", targetType: "MediaAsset", targetId: asset.id, metadata: { fileName: asset.fileName }, ip, userAgent });

  return NextResponse.json({ asset }, { status: 201 });
}

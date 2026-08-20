import { NextRequest, NextResponse } from "next/server";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { saveFile, UnsupportedFileTypeError } from "@/lib/storage";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** Super-Admin-only image upload for platform/company branding assets (logo,
 * favicon) picked before a Company record exists yet -- unlike /api/uploads,
 * this isn't scoped to an active company context or a module. */
export async function POST(req: NextRequest) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, GIF, or WEBP images are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (4MB max)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const stored = await saveFile("platform", file.name, buffer, file.type);
    return NextResponse.json({ file: stored }, { status: 201 });
  } catch (err) {
    if (err instanceof UnsupportedFileTypeError) {
      return NextResponse.json({ error: "That file type isn't supported." }, { status: 400 });
    }
    throw err;
  }
}

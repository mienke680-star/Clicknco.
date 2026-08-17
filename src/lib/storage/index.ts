import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

export interface StoredFile {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const MAX_IMAGE_DIMENSION = 2400;

function safeExt(fileName: string) {
  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return ext || "";
}

/**
 * Storage abstraction. STORAGE_DRIVER=local (default) writes to /public/uploads
 * and is what runs in this environment. Swapping in an S3-compatible driver
 * for production only requires implementing this same saveFile() signature
 * against S3_* env vars and pointing STORAGE_DRIVER=s3 — nothing else in the
 * app (media library, block image props, course video uploads) needs to change.
 */
export async function saveFile(orgId: string, fileName: string, buffer: Buffer, mimeType: string): Promise<StoredFile> {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "s3") {
    throw new Error(
      "STORAGE_DRIVER=s3 is not wired up in this environment. Fill in S3_* env vars and implement the S3 branch of saveFile() (see src/lib/storage/index.ts) before enabling it.",
    );
  }
  return saveFileLocal(orgId, fileName, buffer, mimeType);
}

async function saveFileLocal(orgId: string, fileName: string, buffer: Buffer, mimeType: string): Promise<StoredFile> {
  const dir = path.join(UPLOAD_ROOT, orgId);
  await mkdir(dir, { recursive: true });

  const unique = crypto.randomBytes(8).toString("hex");
  const ext = safeExt(fileName);
  const safeName = `${Date.now()}-${unique}${ext}`;
  const fullPath = path.join(dir, safeName);

  let finalBuffer = buffer;
  let width: number | undefined;
  let height: number | undefined;

  if (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") {
    try {
      const image = sharp(buffer).rotate();
      const metadata = await image.metadata();
      if (metadata.width && metadata.width > MAX_IMAGE_DIMENSION) {
        image.resize({ width: MAX_IMAGE_DIMENSION });
      }
      finalBuffer = await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer().catch(async () => {
        // Non-JPEG-friendly formats (e.g. PNG with transparency) — optimize in place instead.
        return image.toBuffer();
      });
      const finalMeta = await sharp(finalBuffer).metadata();
      width = finalMeta.width;
      height = finalMeta.height;
    } catch {
      // If sharp can't process it for any reason, fall back to storing the original bytes untouched.
      finalBuffer = buffer;
    }
  }

  await writeFile(fullPath, finalBuffer);

  return {
    url: `/uploads/${orgId}/${safeName}`,
    fileName,
    mimeType,
    sizeBytes: finalBuffer.byteLength,
    width,
    height,
  };
}

export function inferMediaKind(mimeType: string): "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "OTHER" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType === "application/pdf" || mimeType.startsWith("text/") || mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("sheet")) return "DOCUMENT";
  return "OTHER";
}

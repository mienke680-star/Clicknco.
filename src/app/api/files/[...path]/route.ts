import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

/** Serves files saved by the netlify-blobs storage driver (see
 * src/lib/storage/index.ts). Public and unauthenticated by design — this
 * mirrors how the local driver serves /public/uploads/* today. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");

  const store = getStore("uploads");
  const result = (await store.getWithMetadata(key, { type: "arrayBuffer" })) as { data: ArrayBuffer; metadata: Record<string, unknown> } | null;
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mimeType = typeof result.metadata?.mimeType === "string" ? result.metadata.mimeType : "application/octet-stream";

  return new NextResponse(result.data, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

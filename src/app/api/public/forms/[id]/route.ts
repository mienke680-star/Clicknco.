import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Public, unauthenticated form definition for the embeddable /f/[id] page —
 * exposes only what's needed to render the form, not company internals. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    select: { id: true, name: true, fields: true, successAction: true },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ form });
}

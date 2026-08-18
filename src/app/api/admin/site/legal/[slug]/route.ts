import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { legalPageSchema } from "@/lib/validation/site";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;
  const { slug } = await params;

  const page = await prisma.legalPage.findUnique({ where: { slug } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ page });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;
  const { slug } = await params;

  const existing = await prisma.legalPage.findUnique({ where: { slug } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = legalPageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const page = await prisma.legalPage.update({
    where: { slug },
    data: { title: parsed.data.title, content: parsed.data.content },
  });

  revalidatePath(`/legal/${slug}`);
  return NextResponse.json({ page });
}

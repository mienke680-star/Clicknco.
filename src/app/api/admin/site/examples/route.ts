import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { exampleSchema } from "@/lib/validation/site";

export async function GET(req: NextRequest) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;

  const examples = await prisma.example.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ examples });
}

export async function POST(req: NextRequest) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = exampleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const data = parsed.data;

  const maxSort = await prisma.example.aggregate({ _max: { sortOrder: true } });
  const example = await prisma.example.create({
    data: {
      title: data.title,
      industry: data.industry || null,
      description: data.description,
      imageUrl: data.imageUrl || null,
      sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      active: data.active ?? true,
    },
  });

  revalidatePath("/");
  return NextResponse.json({ example }, { status: 201 });
}

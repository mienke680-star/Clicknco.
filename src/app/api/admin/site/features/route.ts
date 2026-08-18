import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { marketingFeatureSchema } from "@/lib/validation/site";

export async function GET(req: NextRequest) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;

  const features = await prisma.marketingFeature.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ features });
}

export async function POST(req: NextRequest) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = marketingFeatureSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const data = parsed.data;

  const maxSort = await prisma.marketingFeature.aggregate({ _max: { sortOrder: true } });
  const feature = await prisma.marketingFeature.create({
    data: {
      icon: data.icon,
      title: data.title,
      description: data.description,
      category: data.category || "core",
      sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      active: data.active ?? true,
    },
  });

  revalidatePath("/");
  return NextResponse.json({ feature }, { status: 201 });
}

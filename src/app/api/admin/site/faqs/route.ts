import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { faqItemSchema } from "@/lib/validation/site";

export async function GET(req: NextRequest) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;

  const faqs = await prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ faqs });
}

export async function POST(req: NextRequest) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = faqItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const data = parsed.data;

  const maxSort = await prisma.faqItem.aggregate({ _max: { sortOrder: true } });
  const faq = await prisma.faqItem.create({
    data: {
      question: data.question,
      answer: data.answer,
      sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      active: data.active ?? true,
    },
  });

  revalidatePath("/");
  return NextResponse.json({ faq }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { contactNoteSchema } from "@/lib/validation/contacts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiCompanyContext(req, { module: "contacts", action: "edit" });
  if (isApiError(ctx)) return ctx;
  const { id } = await params;

  const contact = await prisma.contact.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = contactNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const note = await prisma.contactNote.create({
    data: { contactId: id, authorUserId: ctx.user.id, body: parsed.data.body },
    include: { author: { select: { id: true, name: true } } },
  });
  await prisma.contact.update({ where: { id }, data: { lastActivityAt: new Date() } });

  return NextResponse.json({ note }, { status: 201 });
}

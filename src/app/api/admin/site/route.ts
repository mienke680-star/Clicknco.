import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiSuperAdmin, isApiError } from "@/lib/api-guard";
import { siteSettingsUpdateSchema } from "@/lib/validation/site";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const session = await requireApiSuperAdmin(req, { mutate: false });
  if (isApiError(session)) return session;

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await requireApiSuperAdmin(req);
  if (isApiError(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = siteSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  // footer.columns isn't exposed in the settings form (see siteFooterSchema) — merge
  // the editable `text` into the existing JSON instead of overwriting the whole blob.
  let footerUpdate: Prisma.InputJsonValue | undefined;
  if (data.footer !== undefined) {
    const existing = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { footer: true } });
    const existingFooter = (existing?.footer as Record<string, unknown> | null) ?? {};
    footerUpdate = { ...existingFooter, text: data.footer.text } as Prisma.InputJsonValue;
  }

  const settings = await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: {
      ...(data.brand !== undefined ? { brand: data.brand as Prisma.InputJsonValue } : {}),
      ...(data.hero !== undefined ? { hero: data.hero as Prisma.InputJsonValue } : {}),
      ...(footerUpdate !== undefined ? { footer: footerUpdate } : {}),
      ...(data.announcementBar !== undefined ? { announcementBar: data.announcementBar as Prisma.InputJsonValue } : {}),
      ...(data.seoDefaults !== undefined ? { seoDefaults: data.seoDefaults as Prisma.InputJsonValue } : {}),
      ...(data.navigation !== undefined ? { navigation: data.navigation as Prisma.InputJsonValue } : {}),
      ...(data.howItWorks !== undefined ? { howItWorks: data.howItWorks as Prisma.InputJsonValue } : {}),
    },
  });

  const { ip, userAgent } = requestMeta(req);
  await writeAuditLog({ actorUserId: session.user.id, action: "site.updated", targetType: "SiteSettings", ip, userAgent });
  revalidatePath("/");

  return NextResponse.json({ settings });
}

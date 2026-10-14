import { NextRequest, NextResponse } from "next/server";
import { requireApiCompanyContext, isApiError } from "@/lib/api-guard";
import { getPackages, getAddons } from "@/lib/clickco/packages";

export async function GET(req: NextRequest) {
  const ctx = await requireApiCompanyContext(req, { module: "packages", action: "view" });
  if (isApiError(ctx)) return ctx;

  const [packages, addons] = await Promise.all([getPackages(ctx.company.id), getAddons(ctx.company.id)]);
  return NextResponse.json({ packages, addons });
}

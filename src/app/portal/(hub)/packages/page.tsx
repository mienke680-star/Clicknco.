import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getPackages, getAddons } from "@/lib/clickco/packages";
import { PackagesClient } from "./packages-client";

export const metadata: Metadata = { title: "Services and packages" };

export default async function PackagesPage() {
  const ctx = await requireCompanyContext();
  const [packages, addons] = await Promise.all([getPackages(ctx.company.id), getAddons(ctx.company.id)]);

  return <PackagesClient packages={packages} addons={addons} />;
}

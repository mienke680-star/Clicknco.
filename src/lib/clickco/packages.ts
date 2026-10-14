import "server-only";
import { prisma } from "@/lib/db";
import { toNumber, slugify } from "@/lib/utils";
import type { Package, Addon } from "@/generated/prisma/client";

/** Decimal fields converted to plain numbers -- a Prisma Decimal instance
 * can't cross the server/client component boundary as a prop (React Server
 * Components only accept plain serializable values there, unlike a JSON API
 * response, which already works fine via Decimal's own toJSON()). */
export type PackageDTO = Omit<Package, "price" | "deposit" | "instalment" | "onboarding"> & {
  price: number;
  deposit: number | null;
  instalment: number | null;
  onboarding: number | null;
};
export type AddonDTO = Omit<Addon, "price"> & { price: number };

export function toPackageDTO(p: Package): PackageDTO {
  return {
    ...p,
    price: toNumber(p.price),
    deposit: p.deposit != null ? toNumber(p.deposit) : null,
    instalment: p.instalment != null ? toNumber(p.instalment) : null,
    onboarding: p.onboarding != null ? toNumber(p.onboarding) : null,
  };
}
export function toAddonDTO(a: Addon): AddonDTO {
  return { ...a, price: toNumber(a.price) };
}

/** The one place application code reads the service catalogue through --
 * never prisma.package.findMany()/addon.findMany() directly elsewhere. */
export async function getPackages(companyId: string, includeArchived = false): Promise<PackageDTO[]> {
  const rows = await prisma.package.findMany({
    where: { companyId, ...(includeArchived ? {} : { active: true }) },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toPackageDTO);
}

export async function getPackageBySlug(companyId: string, slug: string): Promise<PackageDTO | null> {
  const row = await prisma.package.findFirst({ where: { companyId, slug } });
  return row ? toPackageDTO(row) : null;
}

export async function getAddons(companyId: string, includeArchived = false): Promise<AddonDTO[]> {
  const rows = await prisma.addon.findMany({
    where: { companyId, ...(includeArchived ? {} : { active: true }) },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toAddonDTO);
}

/** Generates a unique (companyId, slug) by appending -2, -3, ... on collision. */
export async function uniquePackageSlug(companyId: string, base: string) {
  const root = slugify(base) || "package";
  let slug = root;
  let n = 1;
  while (await prisma.package.findUnique({ where: { companyId_slug: { companyId, slug } } })) {
    n += 1;
    slug = `${root}-${n}`;
  }
  return slug;
}

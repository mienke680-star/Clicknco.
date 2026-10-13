import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { ModuleBuilderClient } from "./module-builder-client";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  return { title: `Build: ${key}` };
}

export default async function ModuleBuilderPage({ params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireCompanyContext();
  if (!ctx.isSuperAdmin) redirect("/portal");
  const { key } = await params;

  return <ModuleBuilderClient moduleKey={key} />;
}

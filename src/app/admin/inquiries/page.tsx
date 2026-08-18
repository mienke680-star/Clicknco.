import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/misc";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { InquiriesClient } from "./inquiries-client";

export const metadata: Metadata = { title: "Inquiries" };

export default async function InquiriesPage() {
  await requireSuperAdmin();

  return (
    <div>
      <SectionHeading title="Inquiries" description="Requests submitted through the public site's contact form." />
      <InquiriesClient />
    </div>
  );
}

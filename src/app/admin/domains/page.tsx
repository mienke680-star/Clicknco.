import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Domains" };

export default function AdminDomainsPage() {
  return (
    <div>
      <SectionHeading title="Domains" description="Every custom domain and subdomain connected across all companies." />
      <ComingSoon title="Domains list coming next" />
    </div>
  );
}

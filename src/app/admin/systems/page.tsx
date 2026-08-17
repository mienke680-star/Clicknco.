import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Company Systems" };

export default function SystemsPage() {
  return (
    <div>
      <SectionHeading title="Company Systems" description="Your private template library — save a company's modules, dashboard and pipelines as a reusable system, then start new companies from it." />
      <ComingSoon title="Template library coming next" />
    </div>
  );
}

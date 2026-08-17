import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <div>
      <SectionHeading title="Documents" description="Store files and generate documents from merge-field templates." />
      <ComingSoon title="Documents coming next" />
    </div>
  );
}

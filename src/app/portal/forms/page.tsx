import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Forms" };

export default function FormsPage() {
  return (
    <div>
      <SectionHeading title="Forms" description="Build forms that route submissions straight into your contacts and pipelines." />
      <ComingSoon title="Form builder coming next" />
    </div>
  );
}

import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div>
      <SectionHeading title="Reports" description="Leads, sales, tasks, conversion and team activity — filterable by date and user." />
      <ComingSoon title="Reports coming next" />
    </div>
  );
}

import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <div>
      <SectionHeading title="Automations" description="Trigger emails, tasks and notifications automatically." />
      <ComingSoon title="Automation builder coming next" />
    </div>
  );
}

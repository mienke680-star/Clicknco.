import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Emails" };

export default function EmailsPage() {
  return (
    <div>
      <SectionHeading title="Emails" description="Send approved templates, one-off emails and scheduled follow-ups." />
      <ComingSoon title="Email tools coming next" />
    </div>
  );
}

import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Inquiries" };

export default function InquiriesPage() {
  return (
    <div>
      <SectionHeading title="Inquiries" description="Requests submitted through the public site's contact form." />
      <ComingSoon title="Inquiries list coming next" />
    </div>
  );
}

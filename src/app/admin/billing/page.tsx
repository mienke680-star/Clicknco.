import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Billing" };

export default function AdminBillingPage() {
  return (
    <div>
      <SectionHeading title="Billing" description="Packages, fees and payment status for every company — controlled only by Click & Co." />
      <ComingSoon title="Billing ledger coming next" />
    </div>
  );
}

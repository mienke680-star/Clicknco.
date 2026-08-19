import type { Metadata } from "next";
import { SectionHeading, ComingSoon } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Integrations" };

export default function AdminIntegrationsPage() {
  return (
    <div>
      <SectionHeading title="Integrations" description="Connectors available to companies: Google Calendar, Gmail/SMTP, Zapier, Make, WhatsApp, SMS." />
      <ComingSoon title="Integration hub coming next" />
    </div>
  );
}

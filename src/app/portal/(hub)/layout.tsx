import { Geist, Geist_Mono } from "next/font/google";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { getVisibleHubNavKeys } from "@/lib/clickco/hub-nav";
import { HubShell } from "@/components/hub/shell";
import { HubToastProvider } from "@/components/hub/toast";
import "./hub.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCompanyContext();
  // Only plain strings cross the server/client boundary here -- HUB_NAV's
  // icon component references are reconstructed client-side in HubShell.
  const visibleNavKeys = getVisibleHubNavKeys(ctx);

  return (
    <div className={`${geistSans.variable} ${geistMono.variable}`}>
      <HubToastProvider>
        <HubShell visibleNavKeys={visibleNavKeys} userName={ctx.user.name} userEmail={ctx.user.email}>
          {children}
        </HubShell>
      </HubToastProvider>
    </div>
  );
}

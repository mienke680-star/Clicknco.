import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = { title: "Activate your account" };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Activate your account" description="Set your password to finish setting up your account.">
      <AcceptInviteForm token={token || ""} />
    </AuthShell>
  );
}

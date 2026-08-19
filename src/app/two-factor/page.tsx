import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { TwoFactorForm } from "./verify-form";

export const metadata: Metadata = { title: "Two-factor verification" };

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Enter your verification code" description="Check your authenticator app or email for a 6-digit code.">
      <TwoFactorForm next={next || "/portal"} />
    </AuthShell>
  );
}

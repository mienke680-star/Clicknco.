import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForcePasswordChangeForm } from "./change-password-form";

export const metadata: Metadata = { title: "Update your password" };

export default async function ForcePasswordChangePage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (!session.user.mustChangePassword) redirect(session.user.platformRole === "SUPER_ADMIN" ? "/admin" : "/portal");

  return (
    <AuthShell
      title="Set a permanent password"
      description="For security, you need to set your own password before continuing."
    >
      <ForcePasswordChangeForm tempPasswordHint />
    </AuthShell>
  );
}

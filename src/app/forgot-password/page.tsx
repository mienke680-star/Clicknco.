import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email on your account and we'll send you a reset link."
      footer={
        <a href="/login" className="font-medium text-coral-600 hover:underline">
          Back to sign in
        </a>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

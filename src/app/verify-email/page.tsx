import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LinkButton } from "@/components/ui/button";
import { consumeEmailVerificationToken } from "@/lib/auth/verify-email";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await consumeEmailVerificationToken(token) : "invalid";

  const success = result === "verified" || result === "already_verified";

  return (
    <AuthShell title="Email verification">
      <div className="flex flex-col items-center gap-4 text-center">
        {success ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-aqua-600" />
            <p className="text-sm text-navy-600">
              {result === "verified" ? "Your email has been verified." : "Your email was already verified."}
            </p>
          </>
        ) : (
          <>
            <XCircle className="h-10 w-10 text-danger" />
            <p className="text-sm text-navy-600">This verification link is invalid or has expired.</p>
          </>
        )}
        <LinkButton href="/login" className="mt-2 w-full" size="lg">
          Continue to sign in
        </LinkButton>
      </div>
    </AuthShell>
  );
}

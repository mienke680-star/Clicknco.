"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiPost, ApiError, hardNavigate } from "@/lib/api-client";

export function TwoFactorForm({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ redirectTo?: string }>("/api/auth/2fa/verify", { code });
      hardNavigate(res.redirectTo || next || "/portal");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">{error}</div>
      )}
      <div>
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className="text-center text-lg tracking-[0.3em]"
        />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Verify &amp; continue
      </Button>
    </form>
  );
}

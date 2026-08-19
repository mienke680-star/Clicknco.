"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiPost, ApiError, hardNavigate } from "@/lib/api-client";

export function AcceptInviteForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ redirectTo?: string }>("/api/auth/accept-invite", { token, name, password });
      hardNavigate(res.redirectTo || "/portal");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-danger">This invite link is missing its token. Ask whoever invited you to resend it.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-danger">{error}</div>
      )}
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Smith" />
      </div>
      <div>
        <Label htmlFor="password">Choose a password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Activate account
      </Button>
    </form>
  );
}

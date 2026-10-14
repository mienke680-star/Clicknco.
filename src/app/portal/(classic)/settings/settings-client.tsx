"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiPatch, apiPost, ApiError } from "@/lib/api-client";

type TwoFactorMethod = "NONE" | "TOTP" | "EMAIL";

export function SettingsClient({
  name: initialName,
  email,
  twoFactorEnabled: initialEnabled,
  twoFactorMethod: initialMethod,
}: {
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: TwoFactorMethod;
}) {
  return (
    <div>
      <SectionHeading title="Settings" description="Your profile, password and security." />
      <div className="max-w-2xl space-y-6">
        <ProfileCard initialName={initialName} email={email} />
        <PasswordCard />
        <SecurityCard initialEnabled={initialEnabled} initialMethod={initialMethod} />
      </div>
    </div>
  );
}

function ProfileCard({ initialName, email }: { initialName: string; email: string }) {
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (name.trim().length < 1) return toast({ title: "Enter your name", variant: "error" });
    setSaving(true);
    try {
      await apiPatch("/api/auth/profile", { name });
      toast({ title: "Profile updated", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <p className="text-sm font-semibold text-navy-900">Profile</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} disabled />
            <FieldHint>Contact your admin to change your email address.</FieldHint>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!currentPassword) return toast({ title: "Enter your current password", variant: "error" });
    if (newPassword.length < 8) return toast({ title: "New password must be at least 8 characters", variant: "error" });
    if (newPassword !== confirmPassword) return toast({ title: "New passwords don't match", variant: "error" });

    setSaving(true);
    try {
      await apiPost("/api/auth/change-password", { currentPassword, newPassword });
      toast({ title: "Password changed", description: "You've stayed signed in on this device.", variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({ title: "Couldn't change password", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <p className="text-sm font-semibold text-navy-900">Password</p>
        <div>
          <Label>Current password</Label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} loading={saving}>
            <KeyRound className="h-4 w-4" /> Change password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityCard({ initialEnabled, initialMethod }: { initialEnabled: boolean; initialMethod: TwoFactorMethod }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [method, setMethod] = useState(initialMethod);
  const [step, setStep] = useState<"idle" | "totp-setup" | "disable">("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function startTotpSetup() {
    setBusy(true);
    try {
      const res = await apiPost<{ qrCodeDataUrl: string }>("/api/auth/2fa/totp/setup");
      setQrCodeDataUrl(res.qrCodeDataUrl);
      setStep("totp-setup");
    } catch (err) {
      toast({ title: "Couldn't start setup", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotp() {
    if (code.trim().length < 6) return toast({ title: "Enter the 6-digit code", variant: "error" });
    setBusy(true);
    try {
      await apiPost("/api/auth/2fa/totp/confirm", { code });
      setEnabled(true);
      setMethod("TOTP");
      setStep("idle");
      setCode("");
      toast({ title: "Two-factor authentication enabled", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't confirm code", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function enableEmail() {
    setBusy(true);
    try {
      await apiPost("/api/auth/2fa/email/enable");
      setEnabled(true);
      setMethod("EMAIL");
      toast({ title: "Email two-factor authentication enabled", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't enable", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!disablePassword) return toast({ title: "Enter your password to confirm", variant: "error" });
    setBusy(true);
    try {
      await apiPost("/api/auth/2fa/disable", { password: disablePassword });
      setEnabled(false);
      setMethod("NONE");
      setStep("idle");
      setDisablePassword("");
      toast({ title: "Two-factor authentication disabled", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't disable", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-navy-900">Two-factor authentication</p>
          <Badge variant={enabled ? "success" : "neutral"} dot>
            {enabled ? `Enabled (${method === "TOTP" ? "Authenticator app" : "Email"})` : "Disabled"}
          </Badge>
        </div>

        {!enabled && step === "idle" && (
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={startTotpSetup} loading={busy}>
              <ShieldCheck className="h-4 w-4" /> Set up authenticator app
            </Button>
            <Button variant="outline" onClick={enableEmail} loading={busy}>
              <Mail className="h-4 w-4" /> Use email codes instead
            </Button>
          </div>
        )}

        {step === "totp-setup" && qrCodeDataUrl && (
          <div className="space-y-3 rounded-xl border border-navy-100 bg-navy-50 p-4">
            <p className="text-sm text-navy-700">Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code it shows.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeDataUrl} alt="Authenticator QR code" className="h-40 w-40 rounded-lg border border-navy-200 bg-white" />
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label>6-digit code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="max-w-[10rem]" />
              </div>
              <Button onClick={confirmTotp} loading={busy}>
                Confirm
              </Button>
              <Button variant="ghost" onClick={() => setStep("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {enabled && step !== "disable" && (
          <div>
            <Button variant="outline" onClick={() => setStep("disable")}>
              <ShieldOff className="h-4 w-4" /> Disable two-factor authentication
            </Button>
          </div>
        )}

        {step === "disable" && (
          <div className="space-y-3 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-navy-700">Enter your password to confirm.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Password</Label>
                <Input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} className="max-w-[14rem]" />
              </div>
              <Button variant="danger" onClick={disable} loading={busy}>
                Disable
              </Button>
              <Button variant="ghost" onClick={() => setStep("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Must be at least 8 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Must be at least 8 characters"),
});

export const twoFactorVerifySchema = z.object({
  code: z.string().trim().min(6).max(8),
});

/** Used when a user accepts an invite (their User + Membership were already created by
 * a Super Admin/Company Admin) — this only ever sets a password, it never creates a company. */
export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  name: z.string().trim().min(2, "Enter your full name").max(120).optional(),
  password: z.string().min(8, "Must be at least 8 characters"),
});

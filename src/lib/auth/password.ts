import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface PasswordCheck {
  valid: boolean;
  errors: string[];
}

/** Minimum viable strength policy: 8+ chars, upper, lower, number. */
export function checkPasswordStrength(password: string): PasswordCheck {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Must be at least 8 characters long.");
  if (!/[a-z]/.test(password)) errors.push("Must include a lowercase letter.");
  if (!/[A-Z]/.test(password)) errors.push("Must include an uppercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Must include a number.");
  return { valid: errors.length === 0, errors };
}

// Pure types/constants shared between the app (rbac.ts) and standalone scripts
// (prisma/seed.ts). No Next.js imports here — this file must be safe to import
// from a plain Node/tsx script that has no request context.

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "assign"
  | "approve"
  | "settings";

export type StaffPermissions = Record<string, Partial<Record<PermissionAction, boolean>>>;

export const PERMISSION_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "assign",
  "approve",
  "settings",
];

/** Built-in module keys every company gets (see prisma/seed.ts + Build Mode). */
export const BUILTIN_MODULE_KEYS = [
  "contacts",
  "pipelines",
  "tasks",
  "forms",
  "emails",
  "automations",
  "documents",
  "reports",
  "users",
  "settings",
] as const;

export function fullAccess(): Partial<Record<PermissionAction, boolean>> {
  return Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, true]));
}

export function noAccess(): Partial<Record<PermissionAction, boolean>> {
  return Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, false]));
}

export function viewOnly(): Partial<Record<PermissionAction, boolean>> {
  return { ...noAccess(), view: true };
}

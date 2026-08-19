import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionContext } from "@/lib/auth/session";
import { PlatformRole, CompanyRole } from "@/generated/prisma/client";
import type { PermissionAction, StaffPermissions } from "@/lib/permissions";

export type { PermissionAction, StaffPermissions };

export interface CompanyContext {
  user: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>["user"];
  session: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>;
  company: Awaited<ReturnType<typeof prisma.company.findUnique>> | null;
  membership: Awaited<ReturnType<typeof prisma.membership.findUnique>> | null;
  staffPermissions: StaffPermissions | null;
  isSuperAdmin: boolean;
  /** True for Super Admin or a company ADMIN — full access within the company, short of Super-Admin-only areas. */
  isCompanyAdmin: boolean;
  can: (moduleKey: string, action: PermissionAction) => boolean;
}

function buildCan(isSuperAdmin: boolean, isCompanyAdmin: boolean, staffPermissions: StaffPermissions | null) {
  return (moduleKey: string, action: PermissionAction) => {
    if (isSuperAdmin || isCompanyAdmin) return true;
    return Boolean(staffPermissions?.[moduleKey]?.[action]);
  };
}

/**
 * Resolves the caller's identity + effective permissions in their active
 * company. Returns null if there is no valid session. `company` is null if
 * the session has no active company yet (e.g. Super Admin hasn't entered one).
 */
export async function loadCompanyContext(): Promise<CompanyContext | null> {
  const session = await getSessionContext();
  if (!session) return null;

  const isSuperAdmin = session.user.platformRole === PlatformRole.SUPER_ADMIN;
  const companyId = session.activeCompanyId;

  if (!companyId) {
    return {
      user: session.user,
      session,
      company: null,
      membership: null,
      staffPermissions: null,
      isSuperAdmin,
      isCompanyAdmin: false,
      can: buildCan(isSuperAdmin, false, null),
    };
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return {
      user: session.user,
      session,
      company: null,
      membership: null,
      staffPermissions: null,
      isSuperAdmin,
      isCompanyAdmin: false,
      can: buildCan(isSuperAdmin, false, null),
    };
  }

  if (isSuperAdmin) {
    return {
      user: session.user,
      session,
      company,
      membership: null,
      staffPermissions: null,
      isSuperAdmin: true,
      isCompanyAdmin: true,
      can: buildCan(true, true, null),
    };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_companyId: { userId: session.user.id, companyId } },
    include: { staffRole: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    return {
      user: session.user,
      session,
      company,
      membership: null,
      staffPermissions: null,
      isSuperAdmin: false,
      isCompanyAdmin: false,
      can: buildCan(false, false, null),
    };
  }

  const isCompanyAdmin = membership.role === CompanyRole.ADMIN;
  const staffPermissions = (membership.staffRole?.permissions as StaffPermissions | null) ?? null;

  return {
    user: session.user,
    session,
    company,
    membership,
    staffPermissions,
    isSuperAdmin: false,
    isCompanyAdmin,
    can: buildCan(false, isCompanyAdmin, staffPermissions),
  };
}

/** Server-component guard: redirects to /login if unauthenticated. */
export async function requireUser() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/force-password-change");
  return session;
}

/** Server-component guard for the company portal: requires an active company + membership. */
export async function requireCompanyContext() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/force-password-change");

  const ctx = await loadCompanyContext();
  if (!ctx || !ctx.company) {
    // Super Admin with nothing entered yet lands in the control centre instead.
    if (session.user.platformRole === PlatformRole.SUPER_ADMIN) redirect("/admin");
    redirect("/login");
  }
  return ctx as CompanyContext & { company: NonNullable<CompanyContext["company"]> };
}

/** Server-component guard for the Super Admin control centre. Build Mode, branding, billing,
 * domains, company lifecycle, templates and the public Site Manager are ALL Super-Admin-only —
 * this same guard protects those areas even when reached from within a company's portal routes. */
export async function requireSuperAdmin() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (session.user.platformRole !== PlatformRole.SUPER_ADMIN) redirect("/portal");
  if (session.user.mustChangePassword) redirect("/force-password-change");
  return session;
}

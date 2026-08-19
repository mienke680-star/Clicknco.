import "server-only";
import { prisma } from "@/lib/db";

/**
 * Confirms a Contact id (taken from request input) actually belongs to the
 * caller's active company before it's stored as a foreign key on some other
 * record — without this, a user who belongs to more than one company (a
 * supported scenario: Super Admin, or any staff member invited to several
 * companies) could reference another tenant's contact and have its name
 * disclosed to everyone in their current company via joined API responses.
 * Returns an error message if invalid, or null if the id is empty/valid.
 */
export async function assertContactInCompany(companyId: string, contactId: string | null | undefined): Promise<string | null> {
  if (!contactId) return null;
  const exists = await prisma.contact.findFirst({ where: { id: contactId, companyId }, select: { id: true } });
  return exists ? null : "That contact doesn't belong to this company.";
}

/** Same as assertContactInCompany, for a User id being stored as an assignee —
 * confirms the user actually holds a membership in the caller's company. */
export async function assertUserInCompany(companyId: string, userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const membership = await prisma.membership.findUnique({ where: { userId_companyId: { userId, companyId } }, select: { id: true } });
  return membership ? null : "That user isn't a member of this company.";
}

/** Confirms a PipelineStage id belongs to a pipeline owned by the caller's company. */
export async function assertStageInCompany(companyId: string, stageId: string | null | undefined): Promise<string | null> {
  if (!stageId) return null;
  const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, pipeline: { companyId } }, select: { id: true } });
  return stage ? null : "That stage doesn't belong to this company.";
}

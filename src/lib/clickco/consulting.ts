import "server-only";
import { prisma } from "@/lib/db";
import type { RecurringService, DesignBrief, Contact } from "@/generated/prisma/client";

export { DESIGN_FLOW, DESIGN_STATUS_LABEL, HEALTH_LABEL, HEALTH_TONE, nextDesignStatus } from "@/lib/clickco/consulting-calc";

export type RecurringServiceDTO = RecurringService & { contact: Contact };
export type DesignBriefDTO = DesignBrief & { contact: Contact };

const recurringServiceInclude = { contact: true } as const;
const designBriefInclude = { contact: true } as const;

export async function getRecurringServices(companyId: string): Promise<RecurringServiceDTO[]> {
  return prisma.recurringService.findMany({ where: { companyId }, include: recurringServiceInclude, orderBy: { nextReviewAt: "asc" } });
}

export async function getRecurringServiceByContactId(companyId: string, contactId: string): Promise<RecurringServiceDTO | null> {
  return prisma.recurringService.findFirst({ where: { companyId, contactId }, include: recurringServiceInclude });
}

export async function getDesignBriefs(companyId: string): Promise<DesignBriefDTO[]> {
  return prisma.designBrief.findMany({ where: { companyId }, include: designBriefInclude, orderBy: { createdAt: "asc" } });
}

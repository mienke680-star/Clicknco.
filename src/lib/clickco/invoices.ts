import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/** Reads and increments BusinessSettings.nextInvoiceNumber inside the given
 * transaction, formatted "INV-<year>-0001" -- avoids duplicate numbers under
 * concurrent creates. */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  const settings = await tx.businessSettings.upsert({ where: { companyId }, update: {}, create: { companyId } });
  await tx.businessSettings.update({ where: { companyId }, data: { nextInvoiceNumber: settings.nextInvoiceNumber + 1 } });
  const year = new Date().getFullYear();
  return `INV-${year}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`;
}

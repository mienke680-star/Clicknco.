import { z } from "zod";

export const VAT_TREATMENTS = ["UNSET", "NONE", "EXCLUSIVE", "INCLUSIVE"] as const;

export const businessSettingsSchema = z.object({
  tradingName: z.string().trim().max(200).optional().or(z.literal("")),
  ownerName: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
  bankName: z.string().trim().max(100).optional().or(z.literal("")),
  accountNumber: z.string().trim().max(60).optional().or(z.literal("")),
  branchCode: z.string().trim().max(30).optional().or(z.literal("")),
  vatTreatment: z.enum(VAT_TREATMENTS).optional(),
  nextQuoteNumber: z.number().int().min(1).optional(),
  nextInvoiceNumber: z.number().int().min(1).optional(),
});

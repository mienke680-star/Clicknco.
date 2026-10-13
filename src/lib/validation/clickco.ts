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

export const QUOTE_PLANS = ["ONCE", "INSTALMENT_PLAN"] as const;
export const QUOTE_STATUSES = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED"] as const;

export const quoteInputSchema = z.object({
  contactId: z.string().min(1, "Select a client"),
  packageId: z.string().min(1, "Select a package"),
  plan: z.enum(QUOTE_PLANS).default("ONCE"),
  addonIds: z.array(z.string()).max(50).default([]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  send: z.boolean().default(false),
});

export const quoteStatusSchema = z.object({
  status: z.enum(["SENT", "VIEWED", "DECLINED", "DRAFT"]),
});

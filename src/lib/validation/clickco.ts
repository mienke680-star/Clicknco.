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

export const PROJECT_STAGES = ["ONBOARDING", "IN_PRODUCTION", "CLIENT_REVIEW", "WAITING_FOR_CLIENT", "LAUNCHED"] as const;

export const projectCreateSchema = z.object({
  contactId: z.string().min(1, "Select a client"),
  packageId: z.string().min(1, "Select a package"),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  dueDate: z.string().min(1, "Set a due date"),
});

export const projectUpdateSchema = z.object({
  stage: z.enum(PROJECT_STAGES).optional(),
  dueDate: z.string().optional(),
  waitingNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const milestoneUpdateSchema = z.object({
  done: z.boolean(),
});

export const PAYMENT_METHODS = ["EFT", "CARD", "CASH", "OTHER"] as const;

export const invoiceCreateSchema = z.object({
  contactId: z.string().min(1, "Select a client"),
  description: z.string().trim().min(1, "Add a description").max(300),
  amount: z.number().positive(),
  dueDate: z.string().min(1, "Set a due date"),
});

export const paymentCreateSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().min(1),
  method: z.enum(PAYMENT_METHODS).default("EFT"),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
});

export const CONSULTING_HEALTHS = ["GROWING", "ON_TRACK", "NEEDS_ATTENTION"] as const;

export const recurringServiceCreateSchema = z.object({
  contactId: z.string().min(1, "Select a client"),
  platforms: z.string().trim().min(1, "Add the platforms covered").max(200),
  cadenceLabel: z.string().trim().min(1, "Add a cadence label").max(60),
  every: z.number().int().min(1).max(365),
  designQuota: z.number().int().min(1).max(999),
  focus: z.string().trim().max(500).optional().or(z.literal("")),
});

export const recurringServiceHealthSchema = z.object({
  health: z.enum(CONSULTING_HEALTHS),
});

export const designBriefCreateSchema = z.object({
  contactId: z.string().min(1, "Select a client"),
  title: z.string().trim().min(1, "Add what needs designing").max(200),
  detail: z.string().trim().max(300).optional().or(z.literal("")),
});

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

export const CALENDAR_EVENT_KINDS = ["TASK", "MEETING", "CLIENT_WORK", "DEADLINE"] as const;

export const calendarEventCreateSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(200),
  date: z.string().min(1, "Set a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Set a time"),
  durationMinutes: z.number().int().min(1).max(1440),
  kind: z.enum(CALENDAR_EVENT_KINDS).default("TASK"),
  contactId: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const calendarEventUpdateSchema = calendarEventCreateSchema.partial().extend({
  done: z.boolean().optional(),
});

export const PACKAGE_BILLINGS = ["ONCE_OFF", "MONTHLY"] as const;

export const packageCreateSchema = z.object({
  category: z.string().trim().min(1, "Choose a category").max(80),
  name: z.string().trim().min(1, "Give it a name").max(160),
  strapline: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.number().min(0).max(10_000_000),
  billing: z.enum(PACKAGE_BILLINGS).default("ONCE_OFF"),
  customQuote: z.boolean().default(false),
  deposit: z.number().min(0).max(10_000_000).optional().nullable(),
  instalment: z.number().min(0).max(10_000_000).optional().nullable(),
  instalmentMonths: z.number().int().min(1).max(60).optional().nullable(),
  onboarding: z.number().min(0).max(10_000_000).optional().nullable(),
  minimumMonths: z.number().int().min(1).max(60).optional().nullable(),
  featured: z.boolean().default(false),
  features: z.array(z.string().trim().min(1).max(200)).max(40).default([]),
  turnaroundLabel: z.string().trim().max(80).optional().or(z.literal("")),
  internalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  defaultTasks: z.array(z.string().trim().min(1).max(200)).max(40).default([]),
});

export const packageUpdateSchema = packageCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export const addonCreateSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(160),
  price: z.number().min(0).max(10_000_000),
  billing: z.enum(PACKAGE_BILLINGS).default("ONCE_OFF"),
  customQuote: z.boolean().default(false),
  packageId: z.string().optional().nullable(),
});

export const addonUpdateSchema = addonCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

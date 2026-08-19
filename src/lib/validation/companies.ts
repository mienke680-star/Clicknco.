import { z } from "zod";

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Must be at least 2 characters")
  .max(63, "Must be 63 characters or fewer")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only");

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #FF7657");

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const companyCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter a company name").max(120),
  subdomain: slugField,

  industry: optionalText(120),
  contactPerson: optionalText(120),
  contactEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  contactPhone: optionalText(40),
  website: optionalText(200),
  address1: optionalText(200),
  address2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(30),
  country: optionalText(100),
  timezone: optionalText(60),
  notes: optionalText(2000),

  logoUrl: optionalText(500),
  faviconUrl: optionalText(500),
  brandPrimaryColor: hexColor.optional(),
  brandAccentColor: hexColor.optional(),
  brandFont: optionalText(60),
  portalName: optionalText(120),
  loginHeadline: optionalText(200),

  packageName: optionalText(120),
  setupFee: z.union([z.number(), z.string()]).optional(),
  monthlyFee: z.union([z.number(), z.string()]).optional(),
  currency: optionalText(10),

  adminName: optionalText(120),
  adminEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
});

export const companyUpdateSchema = companyCreateSchema
  .omit({ adminName: true, adminEmail: true })
  .extend({
    slug: slugField.optional(),
    status: z.enum(["SETUP", "ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
    billingStatus: z.enum(["TRIAL", "ACTIVE", "OVERDUE", "SUSPENDED", "CANCELLED"]).optional(),
    nextBillingDate: z.string().optional().or(z.literal("")),
    loginImageUrl: optionalText(500),
    portalFooterText: optionalText(300),
    emailFromName: optionalText(120),
    emailFromAddress: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  })
  .partial();

export const inviteMemberSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name").max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
  staffRoleId: z.string().trim().optional().or(z.literal("")),
});

export const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  staffRoleId: z.string().trim().nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

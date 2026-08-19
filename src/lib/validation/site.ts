import { z } from "zod";

const ctaSchema = z.object({ label: z.string().trim().min(1), href: z.string().trim().min(1) });
const navItemSchema = z.object({ label: z.string().trim().min(1), href: z.string().trim().min(1) });
const howItWorksStepSchema = z.object({ step: z.number().int(), title: z.string().trim().min(1), description: z.string().trim().min(1) });

export const siteBrandSchema = z.object({
  name: z.string().trim().min(1),
  tagline: z.string().trim().optional().or(z.literal("")),
  logoUrl: z.string().trim().optional().or(z.literal("")).nullable(),
  faviconUrl: z.string().trim().optional().or(z.literal("")).nullable(),
});

export const siteHeroSchema = z.object({
  headline: z.string().trim().min(1),
  subheadline: z.string().trim().min(1),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema,
});

export const siteFooterSchema = z.object({
  text: z.string().trim().optional().or(z.literal("")),
});

export const siteAnnouncementSchema = z.object({
  enabled: z.boolean(),
  text: z.string().trim().optional().or(z.literal("")),
  linkUrl: z.string().trim().optional().or(z.literal("")),
  linkLabel: z.string().trim().optional().or(z.literal("")),
});

export const siteSeoSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  ogImageUrl: z.string().trim().optional().or(z.literal("")).nullable(),
});

export const siteNavigationSchema = z.array(navItemSchema).max(20);
export const siteHowItWorksSchema = z.array(howItWorksStepSchema).max(20);

/** Every field optional — the settings form saves one section (or a few) at a time. */
export const siteSettingsUpdateSchema = z.object({
  brand: siteBrandSchema.optional(),
  hero: siteHeroSchema.optional(),
  footer: siteFooterSchema.optional(),
  announcementBar: siteAnnouncementSchema.optional(),
  seoDefaults: siteSeoSchema.optional(),
  navigation: siteNavigationSchema.optional(),
  howItWorks: siteHowItWorksSchema.optional(),
});

export const marketingFeatureSchema = z.object({
  icon: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(400),
  category: z.string().trim().max(40).optional().or(z.literal("")),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const industrySchema = z.object({
  icon: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const exampleSchema = z.object({
  title: z.string().trim().min(1).max(80),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().min(1).max(400),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const faqItemSchema = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1000),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const legalPageSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1),
});

export const publicInquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot — real users never fill this in; bots that fill every field do.
  website: z.string().max(0).optional().or(z.literal("")),
});

export const inquiryStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]),
});

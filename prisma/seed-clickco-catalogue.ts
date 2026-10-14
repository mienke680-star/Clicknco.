import "dotenv/config";
import { prisma } from "../src/lib/db";

/**
 * One-off, idempotent seed for Click & Co's own service catalogue (Packages +
 * Addons), transcribed verbatim from the approved Operations Hub design spec
 * (hub.js PACKAGES/ADDONS). NOT part of provisionNewCompany() -- a different,
 * future tenant should not inherit this web-design agency's own brochure, same
 * as Pipelines/Contacts start empty for every new company.
 *
 * Usage:
 *   npx tsx prisma/seed-clickco-catalogue.ts --slug=<company-slug>
 *   npx tsx prisma/seed-clickco-catalogue.ts --company-id=<company-id>
 */

const PACKAGES = [
  {
    slug: "click-starter",
    category: "Websites",
    name: "Click Starter",
    strapline: "One focused landing page with one clear next step.",
    price: 3950,
    billing: "ONCE_OFF" as const,
    deposit: 1500,
    instalment: 695,
    instalmentMonths: 6,
    features: [
      "Custom single-page website",
      "Responsive on mobile, desktop and tablet",
      "Up to 6 content sections",
      "Contact or enquiry form",
      "WhatsApp and social links",
      "Basic SEO, Google indexing and analytics",
      "1 revision round and launch assistance",
    ],
  },
  {
    slug: "starter-website",
    category: "Websites",
    name: "Starter Website",
    strapline: "A credible digital home for a new or growing business.",
    price: 6500,
    billing: "ONCE_OFF" as const,
    deposit: 2500,
    instalment: 850,
    instalmentMonths: 6,
    features: [
      "Up to 5 professionally designed pages",
      "Custom Click & Co design",
      "WhatsApp, contact forms and social integration",
      "Basic SEO, Google indexing and analytics",
      "Image optimisation and security configuration",
      "2 revision rounds and launch assistance",
    ],
  },
  {
    slug: "business-website",
    category: "Websites",
    name: "Business Website",
    strapline: "Conversion-focused structure for an established business.",
    price: 9950,
    billing: "ONCE_OFF" as const,
    deposit: 3500,
    instalment: 1250,
    instalmentMonths: 6,
    featured: true,
    features: [
      "Up to 8 custom pages",
      "Strategic website structure and service pages",
      "Lead-generation forms and conversion calls to action",
      "WhatsApp, social and Google Maps integrations",
      "Technical and on-page SEO foundations",
      "3 revision rounds and 30-day technical support",
    ],
  },
  {
    slug: "business-pro",
    category: "Websites",
    name: "Business Pro",
    strapline: "More content, more divisions and more capability.",
    price: 14500,
    billing: "ONCE_OFF" as const,
    deposit: 5000,
    instalment: 1650,
    instalmentMonths: 6,
    features: [
      "Up to 12 pages with advanced layouts and navigation",
      "Multiple services or divisions",
      "Advanced forms and lead-generation elements",
      "Blog or news setup, portfolio or gallery",
      "Enhanced SEO, analytics and performance optimisation",
      "Customer journey planning and 3 revision rounds",
    ],
  },
  {
    slug: "brand-to-click",
    category: "Brand + Website",
    name: "Brand to Click",
    strapline: "One identity and one consistent digital experience.",
    price: 11950,
    billing: "ONCE_OFF" as const,
    deposit: 4000,
    instalment: 1450,
    instalmentMonths: 6,
    features: [
      "Logo suite, colours and typography",
      "Mini corporate identity guideline",
      "Business card and email signature",
      "Up to 6 custom website pages",
      "Profile picture, social banner and 6 branded social templates",
      "SEO, analytics and launch assistance",
    ],
  },
  {
    slug: "marketing-strategy",
    category: "Marketing",
    name: "Strategy Session",
    strapline: "Focused marketing review with written next steps.",
    price: 1850,
    billing: "ONCE_OFF" as const,
    features: ["Strategy session", "Current marketing review", "Priority action summary"],
  },
  {
    slug: "marketing-audit",
    category: "Marketing",
    name: "Deep-dive Audit",
    strapline: "Brand, website and customer-journey audit with an action plan.",
    price: 3950,
    billing: "ONCE_OFF" as const,
    features: ["Brand and website audit", "Social presence review", "Customer journey and opportunity plan"],
  },
  {
    slug: "marketing-consulting",
    category: "Marketing",
    name: "Monthly Consulting",
    strapline: "Planning, campaign direction and monthly priorities.",
    price: 3500,
    billing: "MONTHLY" as const,
    onboarding: 1500,
    minimumMonths: 3,
    features: ["Monthly priorities", "Campaign and content direction", "Brand and customer-journey guidance"],
  },
  {
    slug: "growth-mode",
    category: "Marketing",
    name: "Growth Mode",
    strapline: "Strategy, creative and direction every month.",
    price: 4950,
    billing: "MONTHLY" as const,
    onboarding: 2500,
    minimumMonths: 3,
    featured: true,
    features: [
      "Marketing consulting and campaign planning",
      "Up to 12 branded social-media designs",
      "Caption and content direction",
      "Up to 4 advertising designs",
      "Monthly performance review and strategy session",
    ],
  },
  {
    slug: "growth-sprint",
    category: "Marketing",
    name: "One-month Growth Sprint",
    strapline: "A short, intensive push for a launch or promotion.",
    price: 5950,
    billing: "ONCE_OFF" as const,
    features: ["One-month campaign sprint", "Creative and content direction", "Paid media spend excluded"],
  },
  {
    slug: "designed-for-business",
    category: "Business Design",
    name: "Designed for Business",
    strapline: "Branded material for every place the business shows up.",
    price: 4500,
    billing: "ONCE_OFF" as const,
    features: ["Social and advertising designs", "Stationery and sales collateral", "Brochures, profiles and presentations"],
  },
  {
    slug: "design-retainer",
    category: "Business Design",
    name: "Design Retainer",
    strapline: "A priority design queue with brand consistency management.",
    price: 3500,
    billing: "MONTHLY" as const,
    onboarding: 1500,
    features: ["Up to 12 social or marketing designs", "Up to 4 advertising designs", "Priority design queue"],
  },
  {
    slug: "start-business-right",
    category: "Business Starter",
    name: "Start the Business Right",
    strapline: "The essential brand, website and launch material together.",
    price: 10950,
    billing: "ONCE_OFF" as const,
    deposit: 3500,
    instalment: 1350,
    instalmentMonths: 6,
    features: [
      "Logo and visual identity",
      "Up to 5-page website",
      "Business card and email signature",
      "6 launch social designs",
      "SEO foundations and launch support",
    ],
  },
  {
    slug: "complete-click",
    category: "All-in-one",
    name: "The Complete Click",
    strapline: "Website, brand, marketing and design as one connected system.",
    price: 19500,
    billing: "ONCE_OFF" as const,
    deposit: 6000,
    instalment: 2550,
    instalmentMonths: 6,
    featured: true,
    features: [
      "Full logo suite and brand guideline",
      "Up to 8-page business website",
      "Business collateral",
      "Marketing strategy and launch campaign",
      "12 social and 4 advertising designs",
      "Digital integrations and launch support",
    ],
  },
];

const ADDONS = [
  { name: "Additional website page", price: 650 },
  { name: "Additional landing page", price: 1500 },
  { name: "Standard social-media design", price: 250 },
  { name: "5 social-media designs", price: 1000 },
  { name: "Advertising design", price: 350 },
  { name: "Business card", price: 650 },
  { name: "Email signature", price: 550 },
  { name: "Letterhead", price: 550 },
  { name: "Flyer or promotional design", price: 750 },
  { name: "Brochure", price: 1500 },
  { name: "Company profile", price: 2500 },
  { name: "Presentation", price: 1800 },
  { name: "Website maintenance", price: 750, billing: "MONTHLY" as const },
  { name: "Content updates", price: 450 },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const companyId = args.find((a) => a.startsWith("--company-id="))?.split("=")[1];
  return { slug, companyId };
}

async function main() {
  const { slug, companyId } = parseArgs();
  if (!slug && !companyId) {
    throw new Error("Pass --slug=<company-slug> or --company-id=<company-id> to target the right tenant.");
  }

  const company = companyId
    ? await prisma.company.findUnique({ where: { id: companyId } })
    : await prisma.company.findUnique({ where: { slug } });
  if (!company) throw new Error(`Company not found (${companyId ? `id=${companyId}` : `slug=${slug}`})`);

  for (const [i, p] of PACKAGES.entries()) {
    await prisma.package.upsert({
      where: { companyId_slug: { companyId: company.id, slug: p.slug } },
      update: {
        category: p.category,
        name: p.name,
        strapline: p.strapline,
        price: p.price,
        billing: p.billing,
        deposit: p.deposit ?? null,
        instalment: p.instalment ?? null,
        instalmentMonths: p.instalmentMonths ?? null,
        onboarding: p.onboarding ?? null,
        minimumMonths: p.minimumMonths ?? null,
        featured: p.featured ?? false,
        features: p.features,
        sortOrder: i,
      },
      create: {
        companyId: company.id,
        slug: p.slug,
        category: p.category,
        name: p.name,
        strapline: p.strapline,
        price: p.price,
        billing: p.billing,
        deposit: p.deposit ?? null,
        instalment: p.instalment ?? null,
        instalmentMonths: p.instalmentMonths ?? null,
        onboarding: p.onboarding ?? null,
        minimumMonths: p.minimumMonths ?? null,
        featured: p.featured ?? false,
        features: p.features,
        sortOrder: i,
      },
    });
  }
  console.log(`Seeded ${PACKAGES.length} packages for ${company.name}.`);

  const existingAddons = await prisma.addon.findMany({ where: { companyId: company.id } });
  const existingNames = new Set(existingAddons.map((a) => a.name));
  const toCreate = ADDONS.filter((a) => !existingNames.has(a.name));
  if (toCreate.length > 0) {
    await prisma.addon.createMany({
      data: toCreate.map((a, i) => ({
        companyId: company.id,
        name: a.name,
        price: a.price,
        billing: a.billing ?? "ONCE_OFF",
        sortOrder: existingAddons.length + i,
      })),
    });
  }
  console.log(`Seeded ${toCreate.length} new add-ons (${existingAddons.length} already existed) for ${company.name}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { provisionNewCompany } from "../src/lib/companies/provision";

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || "clickandcocompany@gmail.com";
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "SUPER_ADMIN_PASSWORD is not set. Add it to .env before seeding — the plaintext value is only ever read here, hashed immediately, and never stored.",
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {}, // never clobber an already-activated account on re-seed
    create: {
      email,
      name: process.env.SUPER_ADMIN_NAME || "Click & Co Admin",
      passwordHash,
      platformRole: "SUPER_ADMIN",
      status: "ACTIVE",
      mustChangePassword: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Super Admin ready: ${user.email}`);
  return user;
}

async function seedSiteSettings() {
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      brand: {
        name: "Click & Co",
        tagline: "We build the system. You run your business.",
        logoUrl: null,
        faviconUrl: null,
      },
      navigation: [
        { label: "What We Do", href: "#what-we-do" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "Industries", href: "#industries" },
        { label: "Features", href: "#features" },
        { label: "Contact", href: "#contact" },
      ],
      footer: {
        columns: [
          {
            title: "Company",
            links: [
              { label: "What We Do", href: "#what-we-do" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Industries", href: "#industries" },
              { label: "Contact", href: "#contact" },
            ],
          },
          {
            title: "Legal",
            links: [
              { label: "Privacy Policy", href: "/legal/privacy" },
              { label: "Terms of Service", href: "/legal/terms" },
            ],
          },
        ],
        text: "Click & Co builds and operates custom business systems for companies.",
      },
      hero: {
        headline: "Your business. Your system. Built around the way you work.",
        subheadline:
          "Stop forcing your business into software that was designed for everyone else. Click & Co builds tailored digital systems for companies — from CRM and workflows to forms, dashboards, pipelines and automation.",
        primaryCta: { label: "Request Your System", href: "#contact" },
        secondaryCta: { label: "See What We Build", href: "#systems" },
      },
      howItWorks: [
        { step: 1, title: "Understand", description: "We learn how your business works." },
        { step: 2, title: "Build", description: "We create your customised Click & Co system." },
        { step: 3, title: "Launch", description: "Your team receives their own secure, branded platform." },
        { step: 4, title: "Improve", description: "Your system can evolve as your company grows." },
      ],
      announcementBar: { enabled: false, text: "", linkUrl: "", linkLabel: "" },
      seoDefaults: {
        title: "Click & Co — Custom Business Systems, Built For You",
        description:
          "Click & Co designs and builds tailored CRM, pipeline, forms and automation systems for companies — a managed platform, not a DIY builder.",
        ogImageUrl: null,
      },
    },
  });
  console.log("Site settings ready.");
}

async function seedMarketingFeatures() {
  const features = [
    { icon: "Users", title: "CRM & Contacts", description: "Every lead and client in one place, with custom fields, tags and full activity history." },
    { icon: "Kanban", title: "Custom Pipelines", description: "Drag-and-drop stages built around how your business actually sells or delivers work." },
    { icon: "CheckSquare", title: "Task Management", description: "List, kanban and calendar views keep every team on top of what's due." },
    { icon: "FileText", title: "Form Builder", description: "Capture enquiries straight into the right pipeline, contact or custom module." },
    { icon: "Workflow", title: "Automation", description: "Trigger emails, tasks, tags and notifications the moment something happens." },
    { icon: "FolderOpen", title: "Documents & Templates", description: "Store contracts and quotes, and generate new ones from merge-field templates." },
    { icon: "BarChart3", title: "Reports", description: "Real numbers on leads, sales, tasks and team activity — filterable by date and user." },
    { icon: "Palette", title: "White-Label Branding", description: "Your logo, colours and domain — your team never needs to see the Click & Co name." },
    { icon: "ShieldCheck", title: "Role-Based Permissions", description: "Decide exactly what every staff member can view, edit or approve." },
    { icon: "Puzzle", title: "Custom Modules", description: "Properties, vehicles, jobs, mandates — any record type your business needs, no code required." },
  ];
  for (const [i, f] of features.entries()) {
    await prisma.marketingFeature.upsert({
      where: { id: `seed-feature-${i}` },
      update: { ...f, sortOrder: i },
      create: { id: `seed-feature-${i}`, ...f, sortOrder: i },
    });
  }
  console.log(`Seeded ${features.length} marketing features.`);
}

async function seedIndustries() {
  const industries = [
    { icon: "Home", name: "Real Estate" },
    { icon: "HardHat", name: "Construction" },
    { icon: "Building2", name: "Property Management" },
    { icon: "Megaphone", name: "Marketing" },
    { icon: "UserSearch", name: "Recruitment" },
    { icon: "Briefcase", name: "Professional Services" },
    { icon: "Wrench", name: "Maintenance" },
    { icon: "BedDouble", name: "Hospitality" },
    { icon: "TrendingUp", name: "Sales Teams" },
    { icon: "Store", name: "Small Businesses" },
  ];
  for (const [i, ind] of industries.entries()) {
    await prisma.industry.upsert({
      where: { id: `seed-industry-${i}` },
      update: { ...ind, sortOrder: i },
      create: { id: `seed-industry-${i}`, ...ind, sortOrder: i },
    });
  }
  console.log(`Seeded ${industries.length} industries.`);
}

async function seedExamples() {
  const examples = [
    { title: "Real Estate CRM", industry: "Real Estate", description: "Properties, buyers, sellers, mandates and agent pipelines in one system." },
    { title: "Construction Management", industry: "Construction", description: "Enquiries, site visits, quotes and job tracking from first contact to completion." },
    { title: "Marketing Agency Hub", industry: "Marketing", description: "Clients, projects, campaigns, content approvals and reporting in one workspace." },
    { title: "Recruitment Pipeline", industry: "Recruitment", description: "Candidates, vacancies, interviews and placements tracked stage by stage." },
  ];
  for (const [i, ex] of examples.entries()) {
    await prisma.example.upsert({
      where: { id: `seed-example-${i}` },
      update: { ...ex, sortOrder: i },
      create: { id: `seed-example-${i}`, ...ex, sortOrder: i },
    });
  }
  console.log(`Seeded ${examples.length} examples.`);
}

async function seedFaqs() {
  const faqs = [
    { q: "Is Click & Co a website or funnel builder?", a: "No. Click & Co is not a DIY builder — we design and build a custom business-management system for your company: CRM, pipelines, tasks, forms, automation, documents and reports, all tailored to how you work." },
    { q: "Can my team create their own accounts?", a: "No. For security, every user account is created by us or by your Company Admin. There is no public sign-up." },
    { q: "Can the system change as we grow?", a: "Yes. We can add new modules, fields, automations and reports at any time — you're never stuck with what you started with." },
    { q: "Will it have our own branding?", a: "Yes. Your team logs into a system with your logo, colours and — if you'd like — your own domain." },
    { q: "How long does it take to launch?", a: "It depends on how much of your operation we're building. Simple systems can launch in days; more involved ones take longer. We'll give you a clear timeline after the initial call." },
    { q: "Is our data secure and separate from other companies?", a: "Yes. Every company's data is fully isolated. No company can ever see another company's records." },
  ];
  for (const [i, item] of faqs.entries()) {
    await prisma.faqItem.upsert({
      where: { id: `seed-faq-${i}` },
      update: { question: item.q, answer: item.a, sortOrder: i },
      create: { id: `seed-faq-${i}`, question: item.q, answer: item.a, sortOrder: i },
    });
  }
  console.log(`Seeded ${faqs.length} FAQs.`);
}

async function seedLegalPages() {
  await prisma.legalPage.upsert({
    where: { slug: "privacy" },
    update: {},
    create: {
      slug: "privacy",
      title: "Privacy Policy",
      content:
        "<p>This is a starting Privacy Policy for Click & Co. Replace this text with policy reviewed by your counsel before going live.</p><p>Click & Co collects the information companies and their authorised users provide while using systems we build and operate on their behalf, and uses it solely to provide and improve those systems. We do not sell personal data. Each company's data is isolated and is never shared with, or visible to, any other company on the platform.</p>",
      updatedAt: new Date(),
    },
  });
  await prisma.legalPage.upsert({
    where: { slug: "terms" },
    update: {},
    create: {
      slug: "terms",
      title: "Terms of Service",
      content:
        "<p>This is a starting Terms of Service for Click & Co. Replace this text with terms reviewed by your counsel before going live.</p><p>Access to Click & Co systems is provided to companies and their authorised users under agreement with Click & Co. Accounts are provisioned by Click & Co or by an authorised Company Admin; self-registration is not available. Continued access is subject to the billing terms agreed with Click & Co.</p>",
      updatedAt: new Date(),
    },
  });
  console.log("Seeded legal pages.");
}

async function seedDemoCompany() {
  const company = await prisma.company.upsert({
    where: { slug: "riverstone-properties-sample" },
    update: {},
    create: {
      name: "Riverstone Properties (Sample)",
      slug: "riverstone-properties-sample",
      subdomain: "riverstone-sample",
      status: "ACTIVE",
      billingStatus: "ACTIVE",
      packageName: "Custom",
      monthlyFee: 0,
      industry: "Real Estate",
      contactPerson: "Sample Contact",
      contactEmail: "demo@riverstoneproperties.example",
      timezone: "UTC",
      notes: "Seeded sample company demonstrating a real-estate-flavoured Click & Co system. Safe to delete once you've created your first real company.",
    },
  });

  const existingModules = await prisma.companyModule.count({ where: { companyId: company.id } });
  if (existingModules === 0) {
    await provisionNewCompany(company.id);

    // Swap the default pipeline for the real-estate example from the brief.
    await prisma.pipeline.deleteMany({ where: { companyId: company.id } });
    const pipeline = await prisma.pipeline.create({
      data: {
        companyId: company.id,
        name: "Property Pipeline",
        stages: {
          create: ["New Lead", "Contacted", "Viewing", "Offer", "Sold", "Lost"].map((n, i) => ({ name: n, order: i })),
        },
      },
      include: { stages: true },
    });

    const propertiesModule = await prisma.companyModule.create({
      data: {
        companyId: company.id,
        key: "properties",
        name: "Properties",
        icon: "Home",
        kind: "CUSTOM",
        active: true,
        sortOrder: 10,
        fields: {
          create: [
            { key: "address", label: "Property Address", type: "TEXT", required: true, sortOrder: 0 },
            { key: "listing_price", label: "Listing Price", type: "CURRENCY", sortOrder: 1 },
            { key: "property_type", label: "Property Type", type: "DROPDOWN", options: { choices: ["Residential", "Commercial", "Land"] }, sortOrder: 2 },
            { key: "bedrooms", label: "Bedrooms", type: "NUMBER", sortOrder: 3 },
            { key: "bathrooms", label: "Bathrooms", type: "NUMBER", sortOrder: 4 },
            { key: "agent", label: "Agent", type: "USER", sortOrder: 5 },
            { key: "status", label: "Status", type: "STATUS", options: { choices: ["Active", "Under Offer", "Sold"] }, sortOrder: 6 },
            { key: "mandate_expiry", label: "Mandate Expiry", type: "DATE", sortOrder: 7 },
            { key: "notes", label: "Notes", type: "NOTES", showInList: false, sortOrder: 8 },
          ],
        },
      },
    });

    await prisma.moduleRecord.createMany({
      data: [
        {
          companyId: company.id,
          moduleId: propertiesModule.id,
          data: { address: "12 Riverstone Lane", listing_price: 425000, property_type: "Residential", bedrooms: 3, bathrooms: 2, status: "Active" },
        },
        {
          companyId: company.id,
          moduleId: propertiesModule.id,
          data: { address: "4 Harbour View Office Park", listing_price: 1250000, property_type: "Commercial", status: "Under Offer" },
        },
      ],
    });

    const contacts = await Promise.all(
      [
        { firstName: "Amara", lastName: "Okafor", email: "amara.okafor@example.com", phone: "+1 555 0101", status: "Lead", leadSource: "Website form" },
        { firstName: "Liam", lastName: "Chen", email: "liam.chen@example.com", phone: "+1 555 0102", status: "Customer", leadSource: "Referral" },
        { firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", phone: "+1 555 0103", status: "Lead", leadSource: "Walk-in" },
      ].map((c) => prisma.contact.create({ data: { companyId: company.id, ...c } })),
    );

    await prisma.pipelineCard.createMany({
      data: [
        { companyId: company.id, pipelineId: pipeline.id, stageId: pipeline.stages[0]!.id, contactId: contacts[0]!.id, title: "Amara Okafor — 12 Riverstone Lane", value: 425000, sortOrder: 0 },
        { companyId: company.id, pipelineId: pipeline.id, stageId: pipeline.stages[2]!.id, contactId: contacts[1]!.id, title: "Liam Chen — Harbour View Office", value: 1250000, sortOrder: 0 },
        { companyId: company.id, pipelineId: pipeline.id, stageId: pipeline.stages[1]!.id, contactId: contacts[2]!.id, title: "Priya Nair — first viewing request", value: 310000, sortOrder: 0 },
      ],
    });

    await prisma.task.createMany({
      data: [
        { companyId: company.id, title: "Call Amara Okafor about financing", relatedContactId: contacts[0]!.id, priority: "HIGH", status: "TODO", dueDate: new Date(Date.now() + 2 * 86400000) },
        { companyId: company.id, title: "Send offer paperwork to Liam Chen", relatedContactId: contacts[1]!.id, priority: "URGENT", status: "IN_PROGRESS", dueDate: new Date(Date.now() + 86400000) },
        { companyId: company.id, title: "Prepare listing photos for 12 Riverstone Lane", priority: "MEDIUM", status: "TODO", dueDate: new Date(Date.now() + 5 * 86400000) },
      ],
    });

    console.log(`Seeded demo company "${company.name}" with sample data.`);
  } else {
    console.log(`Demo company "${company.name}" already provisioned — skipping sample data.`);
  }

  return company;
}

async function main() {
  await seedSuperAdmin();
  await seedSiteSettings();
  await seedMarketingFeatures();
  await seedIndustries();
  await seedExamples();
  await seedFaqs();
  await seedLegalPages();
  await seedDemoCompany();
  console.log("\nSeed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

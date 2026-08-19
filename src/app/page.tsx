import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { LinkButton } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { FaqAccordion } from "./faq-accordion";
import { ContactSection } from "./contact-section";

interface Brand {
  name: string;
  tagline?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}
interface Cta {
  label: string;
  href: string;
}
interface Hero {
  headline: string;
  subheadline: string;
  primaryCta: Cta;
  secondaryCta: Cta;
}
interface NavItem {
  label: string;
  href: string;
}
interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}
interface Announcement {
  enabled: boolean;
  text?: string;
  linkUrl?: string;
  linkLabel?: string;
}
interface Footer {
  columns: { title: string; links: NavItem[] }[];
  text?: string;
}
interface SeoDefaults {
  title: string;
  description: string;
  ogImageUrl?: string | null;
}

async function getSiteData() {
  const [settings, features, industries, examples, faqs] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.marketingFeature.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.industry.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.example.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.faqItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { settings, features, industries, examples, faqs };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const seo = settings?.seoDefaults as unknown as SeoDefaults | undefined;
  if (!seo) return {};
  return {
    title: seo.title,
    description: seo.description,
    openGraph: seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : undefined,
  };
}

export default async function HomePage() {
  const { settings, features, industries, examples, faqs } = await getSiteData();

  const brand = (settings?.brand as unknown as Brand) ?? { name: "Click & Co" };
  const hero = settings?.hero as unknown as Hero | undefined;
  const navItems = (settings?.navigation as unknown as NavItem[]) ?? [];
  const howItWorks = (settings?.howItWorks as unknown as HowItWorksStep[]) ?? [];
  const announcement = settings?.announcementBar as unknown as Announcement | undefined;
  const footer = settings?.footer as unknown as Footer | undefined;

  return (
    <div className="min-h-screen bg-cream">
      {announcement?.enabled && announcement.text && (
        <div className="bg-navy-900 px-4 py-2 text-center text-sm text-white">
          {announcement.text}{" "}
          {announcement.linkUrl && announcement.linkLabel && (
            <a href={announcement.linkUrl} className="font-semibold underline underline-offset-2">
              {announcement.linkLabel}
            </a>
          )}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/90 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-500 text-sm font-bold text-white">
                {brand.name.slice(0, 1)}
              </div>
            )}
            <span className="text-lg font-bold tracking-tight text-navy-900">{brand.name}</span>
          </Link>
          <nav className="hidden items-center gap-7 sm:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-sm font-medium text-navy-600 hover:text-navy-900">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="text-sm font-medium text-navy-500 hover:text-navy-900">
              Client Login
            </Link>
            <LinkButton href="#contact" size="sm">
              Request Your System
            </LinkButton>
          </div>
          <MobileNav navItems={navItems} />
        </div>
      </header>

      {hero && (
        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full bg-peach px-3.5 py-1.5 text-xs font-semibold text-coral-700">
            <Sparkles className="h-3.5 w-3.5" /> Built for your business, not the other way around
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">{hero.headline}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-navy-500">{hero.subheadline}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href={hero.primaryCta.href} size="lg">
              {hero.primaryCta.label} <ArrowRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href={hero.secondaryCta.href} variant="outline" size="lg">
              {hero.secondaryCta.label}
            </LinkButton>
          </div>
        </section>
      )}

      <section id="what-we-do" className="border-t border-navy-100 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">What we do</p>
            <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">We don&apos;t sell software. We build yours.</h2>
            <p className="mt-4 text-navy-500">
              Every business runs differently — but most software forces everyone into the same rigid template. Click &amp; Co takes the
              opposite approach: we sit down with your business, understand exactly how work actually flows through it, and build a
              managed system around that. Not a template you configure yourself. Not a DIY builder. A real system, designed and operated
              for you.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { title: "Understood, not templated", body: "We start with how your business actually operates, not a generic workflow." },
              { title: "Built, not assembled", body: "Every module, field and automation is set up for you — nothing to configure alone." },
              { title: "Operated, not abandoned", body: "We host it, secure it, and keep improving it as your business changes." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-navy-100 p-6">
                <Check className="h-5 w-5 text-aqua-600" />
                <p className="mt-3 font-semibold text-navy-900">{item.title}</p>
                <p className="mt-1.5 text-sm text-navy-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {examples.length > 0 && (
        <section id="systems" className="py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">Systems we build</p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">Real systems, for real businesses.</h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {examples.map((ex) => (
                <div key={ex.id} className="rounded-2xl border border-navy-100 bg-white p-6">
                  {ex.industry && <p className="text-xs font-semibold uppercase tracking-wide text-navy-300">{ex.industry}</p>}
                  <p className="mt-1.5 text-lg font-semibold text-navy-900">{ex.title}</p>
                  <p className="mt-2 text-sm text-navy-500">{ex.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {howItWorks.length > 0 && (
        <section id="how-it-works" className="border-t border-navy-100 bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">How it works</p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">From first call to live system.</h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step) => (
                <div key={step.step} className="relative rounded-2xl border border-navy-100 p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{step.step}</div>
                  <p className="mt-4 font-semibold text-navy-900">{step.title}</p>
                  <p className="mt-1.5 text-sm text-navy-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {industries.length > 0 && (
        <section id="industries" className="py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">Industries</p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">Built for how your industry actually works.</h2>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {industries.map((ind) => (
                <div key={ind.id} className="flex flex-col items-center gap-3 rounded-2xl border border-navy-100 bg-white px-4 py-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach text-coral-600">
                    <DynamicIcon name={ind.icon} className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-navy-800">{ind.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {features.length > 0 && (
        <section id="features" className="border-t border-navy-100 bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">Features</p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">Everything your system can include.</h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.id} className="rounded-2xl border border-navy-100 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                    <DynamicIcon name={f.icon} className="h-5 w-5" />
                  </div>
                  <p className="mt-3.5 font-semibold text-navy-900">{f.title}</p>
                  <p className="mt-1.5 text-sm text-navy-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">Why a custom system</p>
          <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">Off-the-shelf software makes you adapt. We make the software adapt.</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-navy-900 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-300">Generic software</p>
              <ul className="mt-3 space-y-2 text-sm text-navy-200">
                <li>Rigid fields and workflows built for everyone</li>
                <li>You pay for modules you&apos;ll never use</li>
                <li>Your team learns to work around the tool</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-coral-500 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-coral-600">Click &amp; Co</p>
              <ul className="mt-3 space-y-2 text-sm text-navy-700">
                <li>Modules and fields built around your exact process</li>
                <li>Only what your business actually needs</li>
                <li>The tool works the way your team already does</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section id="faq" className="border-t border-navy-100 bg-white py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">FAQ</p>
              <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">Common questions.</h2>
            </div>
            <div className="mt-10">
              <FaqAccordion items={faqs} />
            </div>
          </div>
        </section>
      )}

      <section id="contact" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-coral-600">Get started</p>
            <h2 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">Tell us what you need built.</h2>
            <p className="mt-3 text-navy-500">Book a consultation and we&apos;ll map out exactly what your system should include.</p>
          </div>
          <ContactSection />
        </div>
      </section>

      <section className="bg-navy-900 py-16 text-center text-white">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to work with Click &amp; Co?</h2>
        <p className="mx-auto mt-2 max-w-md text-navy-200">Let&apos;s design the system your business has been missing.</p>
        <div className="mt-7">
          <LinkButton href="#contact" size="lg">
            Work With Click &amp; Co <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </section>

      <footer className="border-t border-navy-100 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoUrl} alt={brand.name} className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-500 text-xs font-bold text-white">{brand.name.slice(0, 1)}</div>
                )}
                <span className="font-bold text-navy-900">{brand.name}</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-navy-400">{footer?.text ?? brand.tagline}</p>
            </div>
            {footer?.columns?.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {link.href.startsWith("/") ? (
                        <Link href={link.href} className="text-sm text-navy-500 hover:text-navy-900">
                          {link.label}
                        </Link>
                      ) : (
                        <a href={link.href} className="text-sm text-navy-500 hover:text-navy-900">
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-navy-50 pt-6 text-center text-xs text-navy-300">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

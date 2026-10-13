import { money } from "@/lib/clickco/format";
import type { PackageDTO, AddonDTO } from "@/lib/clickco/packages";
import type { QuotePlan, VatTreatment } from "@/generated/prisma/client";

export interface QuoteCalcLine {
  label: string;
  sub: string;
  amount: number;
  recurring: boolean;
}

export interface QuoteCalcResult {
  lines: QuoteCalcLine[];
  subtotal: number; // once-off portion, pre-VAT
  monthlyTotal: number; // recurring monthly portion
  vatAmount: number;
  total: number;
  depositAmount: number; // what the deposit invoice charges on acceptance
}

/** Ported from the approved spec's quoteCalc(). VAT follows Business details'
 * vatTreatment; addons never affect the deposit, matching the original. */
export function quoteCalc(pkg: PackageDTO, plan: QuotePlan, addons: AddonDTO[], vatTreatment: VatTreatment): QuoteCalcResult {
  const lines: QuoteCalcLine[] = [];
  let once = 0;
  let monthly = 0;
  let deposit = 0;

  if (pkg.billing === "MONTHLY") {
    lines.push({
      label: pkg.name,
      sub: `Per month${pkg.minimumMonths ? `, ${pkg.minimumMonths} month minimum` : ""}`,
      amount: pkg.price,
      recurring: true,
    });
    monthly += pkg.price;
    if (pkg.onboarding) {
      lines.push({ label: "Onboarding fee", sub: "Once-off, first invoice", amount: pkg.onboarding, recurring: false });
      once += pkg.onboarding;
    }
    deposit = (pkg.onboarding ?? 0) + pkg.price;
  } else if (plan === "INSTALMENT_PLAN" && pkg.deposit != null) {
    const total = pkg.deposit + (pkg.instalment ?? 0) * (pkg.instalmentMonths ?? 0);
    lines.push({
      label: pkg.name,
      sub: `Six-month plan: ${money(pkg.deposit)} deposit + ${pkg.instalmentMonths} x ${money(pkg.instalment)}`,
      amount: total,
      recurring: false,
    });
    once += total;
    deposit = pkg.deposit;
  } else {
    lines.push({
      label: pkg.name,
      sub: pkg.deposit != null ? "Once-off: 50% deposit, balance before launch" : "Once-off",
      amount: pkg.price,
      recurring: false,
    });
    once += pkg.price;
    deposit = Math.round((pkg.price / 2) * 100) / 100;
  }

  for (const addon of addons) {
    lines.push({ label: addon.name, sub: addon.billing === "MONTHLY" ? "Per month" : "Once-off", amount: addon.price, recurring: addon.billing === "MONTHLY" });
    if (addon.billing === "MONTHLY") monthly += addon.price;
    else once += addon.price;
  }

  const sub = once + monthly;
  let vatAmount = 0;
  if (vatTreatment === "EXCLUSIVE") vatAmount = Math.round(sub * 0.15 * 100) / 100;
  if (vatTreatment === "INCLUSIVE") vatAmount = Math.round(((sub * 15) / 115) * 100) / 100;
  const total = vatTreatment === "EXCLUSIVE" ? sub + vatAmount : sub;

  return { lines, subtotal: once, monthlyTotal: monthly, vatAmount, total, depositAmount: deposit };
}

/** The deposit invoice's amount, VAT-adjusted the same way acceptQuote() does
 * in the spec: only EXCLUSIVE treatment grosses the deposit up by 15%. */
export function depositInvoiceAmount(depositAmount: number, vatTreatment: VatTreatment): number {
  return vatTreatment === "EXCLUSIVE" ? Math.round(depositAmount * 1.15 * 100) / 100 : depositAmount;
}

export function depositInvoiceDescription(pkg: PackageDTO, plan: QuotePlan): string {
  if (pkg.billing === "MONTHLY") return `${pkg.name}: onboarding and first month`;
  return `${pkg.name}: ${plan === "INSTALMENT_PLAN" ? "deposit" : "50% deposit"}`;
}

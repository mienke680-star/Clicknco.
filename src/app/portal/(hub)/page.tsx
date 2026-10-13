import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { money } from "@/lib/clickco/format";

export const metadata: Metadata = { title: "Today" };

/** Lightweight Today page, built incrementally alongside the rest of the
 * Operations Hub. The full "Needs you" queue, quick-add and timeline land
 * once Invoices/Projects/Calendar exist too (see "Coming next" below). */
export default async function TodayPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [clientCount, openQuotes, packageCount, businessSettings] = await Promise.all([
    prisma.contact.count({ where: { companyId } }),
    prisma.quote.findMany({ where: { companyId, status: { in: ["SENT", "VIEWED"] } }, select: { total: true } }),
    prisma.package.count({ where: { companyId, active: true } }),
    prisma.businessSettings.findUnique({ where: { companyId } }),
  ]);

  const businessReady = Boolean(businessSettings?.tradingName && businessSettings.vatTreatment !== "UNSET");
  const openQuoteValue = openQuotes.reduce((sum, q) => sum + Number(q.total), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 tabIndex={-1}>Hi {ctx.user.name.split(" ")[0]}</h1>
          <p>Here&apos;s what&apos;s set up so far — Calendar and your full day view are on their way.</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <small>Clients</small>
          <b className="num">{clientCount}</b>
          <em>in your CRM</em>
        </div>
        <div className="stat">
          <small>Quotes awaiting reply</small>
          <b className="num">{money(openQuoteValue)}</b>
          <em>{openQuotes.length} open</em>
        </div>
        <div className="stat">
          <small>Packages</small>
          <b className="num">{packageCount}</b>
          <em>in your catalogue</em>
        </div>
        <div className="stat">
          <small>Business profile</small>
          <b className="num">{businessReady ? "Ready" : "Incomplete"}</b>
          <em className={businessReady ? "good" : "bad"}>{businessReady ? "set up" : "needs details"}</em>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Coming next</h2>
            <p>Each phase below lands as its own working, reviewable piece.</p>
          </div>
        </div>
        <ul className="rows">
          <li className="row">
            <div>
              <b>Calendar</b>
              <span className="sub">Invoice due dates, project deadlines and consulting reviews in one place.</span>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}

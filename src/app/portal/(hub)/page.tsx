import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Today" };

/** Phase 1 of the Operations Hub build: a lightweight Today page covering
 * what already exists (clients, catalogue, team, business profile). The full
 * "Needs you" queue, quick-add and timeline land once Quotes/Invoices/
 * Projects/Calendar exist in later phases. */
export default async function TodayPage() {
  const ctx = await requireCompanyContext();
  const companyId = ctx.company.id;

  const [clientCount, packageCount, memberCount, businessSettings] = await Promise.all([
    prisma.contact.count({ where: { companyId } }),
    prisma.package.count({ where: { companyId, active: true } }),
    prisma.membership.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.businessSettings.findUnique({ where: { companyId } }),
  ]);

  const businessReady = Boolean(businessSettings?.tradingName && businessSettings.vatTreatment !== "UNSET");

  return (
    <>
      <div className="page-head">
        <div>
          <h1 tabIndex={-1}>Hi {ctx.user.name.split(" ")[0]}</h1>
          <p>Here&apos;s what&apos;s set up so far — Quotes, Invoices, Projects and your full day view are on their way.</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <small>Clients</small>
          <b className="num">{clientCount}</b>
          <em>in your CRM</em>
        </div>
        <div className="stat">
          <small>Packages</small>
          <b className="num">{packageCount}</b>
          <em>in your catalogue</em>
        </div>
        <div className="stat">
          <small>Team members</small>
          <b className="num">{memberCount}</b>
          <em>active</em>
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
              <b>Quotes</b>
              <span className="sub">Build and send quotes from your packages, with real PDF documents.</span>
            </div>
          </li>
          <li className="row">
            <div>
              <b>Projects, invoices and payments</b>
              <span className="sub">Accepting a quote creates a project and a deposit invoice automatically.</span>
            </div>
          </li>
          <li className="row">
            <div>
              <b>Social consulting</b>
              <span className="sub">Track recurring client retainers and the design queue.</span>
            </div>
          </li>
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

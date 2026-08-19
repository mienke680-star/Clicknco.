import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { applyMergeFields } from "@/lib/mail/merge";
import { PrintButton } from "./print-button";

export default async function DocumentPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contactId?: string }>;
}) {
  const { id } = await params;
  const { contactId } = await searchParams;
  const ctx = await requireCompanyContext();

  const template = await prisma.documentTemplate.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!template) notFound();

  const contact = contactId ? await prisma.contact.findFirst({ where: { id: contactId, companyId: ctx.company.id } }) : null;
  const content = contact ? applyMergeFields(template.content, contact) : template.content;

  return (
    <div className="min-h-screen bg-navy-50 py-10 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-6 flex max-w-3xl items-center justify-between px-4">
        <p className="text-sm text-navy-500">{contact ? `Generated for ${contact.firstName} ${contact.lastName ?? ""}` : "No contact selected — merge fields are shown as-is."}</p>
        <PrintButton />
      </div>
      <div className="mx-auto max-w-3xl rounded-2xl border border-navy-100 bg-white p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}

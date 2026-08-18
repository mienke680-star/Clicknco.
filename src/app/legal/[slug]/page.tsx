import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.legalPage.findUnique({ where: { slug } });
  return { title: page?.title ?? "Legal" };
}

export default async function LegalPageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.legalPage.findUnique({ where: { slug } });
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
          <ArrowLeft className="h-4 w-4" /> Back to Click &amp; Co
        </Link>
        <h1 className="text-3xl font-bold text-navy-900">{page.title}</h1>
        <p className="mt-1 text-sm text-navy-400">Last updated {formatDate(page.updatedAt)}</p>
        <div
          className="prose prose-navy mt-8 max-w-none text-navy-700 [&_p]:mb-4 [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}

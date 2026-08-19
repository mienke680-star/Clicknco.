import Link from "next/link";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-navy-900">
            Click <span className="text-coral-500">&amp;</span> Co
          </span>
        </Link>
        <div className="rounded-2xl border border-navy-100 bg-white p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-semibold text-navy-900">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-navy-400">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-navy-400">{footer}</div>}
      </div>
    </main>
  );
}

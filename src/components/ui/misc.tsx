import * as React from "react";
import { Loader2, AlertTriangle, Construction } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-coral-500", className)} />;
}

export function PageSpinner() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-navy-50 border-navy-100 text-navy-700",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    danger: "bg-red-50 border-red-200 text-red-700",
  }[variant];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", styles)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-peach text-coral-600">
        <Construction className="h-7 w-7" />
      </div>
      <div>
        <p className="text-lg font-semibold text-navy-900">{title}</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-navy-400">
          {description ?? "This module is on our roadmap and isn't wired up yet in this build. The data model already supports it — the interface is coming soon."}
        </p>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-navy-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

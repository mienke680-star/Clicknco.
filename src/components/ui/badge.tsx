import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      neutral: "bg-navy-50 text-navy-600",
      navy: "bg-navy-900 text-white",
      coral: "bg-coral-100 text-coral-700",
      aqua: "bg-aqua-100 text-aqua-800",
      success: "bg-aqua-100 text-aqua-800",
      warning: "bg-amber-100 text-amber-700",
      danger: "bg-red-100 text-red-700",
      outline: "border border-navy-200 text-navy-600",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

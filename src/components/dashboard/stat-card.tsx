import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = "navy",
}: {
  label: string;
  value: string | number;
  icon: string;
  trend?: { value: string; positive: boolean };
  accent?: "navy" | "coral" | "aqua";
}) {
  const accentClasses = {
    navy: "bg-navy-50 text-navy-700",
    coral: "bg-coral-50 text-coral-600",
    aqua: "bg-aqua-50 text-aqua-700",
  }[accent];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accentClasses)}>
          <DynamicIcon name={icon} className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <p className={cn("mt-3 text-xs font-medium", trend.positive ? "text-aqua-700" : "text-danger")}>
          {trend.value}
        </p>
      )}
    </Card>
  );
}

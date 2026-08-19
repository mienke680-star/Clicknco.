"use client";

import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { cn } from "@/lib/utils";

/** Curated set of module-relevant Lucide icon names — every one verified to
 * exist in the installed lucide-react version (see DynamicIcon). */
export const MODULE_ICON_CHOICES = [
  "Layers",
  "Package",
  "Boxes",
  "Briefcase",
  "Building2",
  "House",
  "Car",
  "Truck",
  "Wrench",
  "ShoppingCart",
  "ShoppingBag",
  "Tag",
  "Tags",
  "FileText",
  "FolderOpen",
  "Users",
  "User",
  "Contact",
  "Phone",
  "Mail",
  "Calendar",
  "CalendarClock",
  "ClipboardList",
  "ClipboardCheck",
  "ListChecks",
  "Kanban",
  "Workflow",
  "ChartColumn",
  "ChartPie",
  "TrendingUp",
  "DollarSign",
  "CreditCard",
  "Receipt",
  "Star",
  "Heart",
  "Bookmark",
  "Globe",
  "MapPin",
  "Camera",
  "Image",
  "Video",
  "Utensils",
  "Coffee",
  "Scissors",
  "Stethoscope",
  "GraduationCap",
  "BookOpen",
  "Gavel",
  "Scale",
  "Shield",
  "Award",
  "Gift",
  "Plane",
  "Ship",
  "Factory",
  "Hammer",
  "PenTool",
  "Palette",
  "Dumbbell",
] as const;

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="grid max-h-56 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border border-navy-100 p-2 scrollbar-thin sm:grid-cols-10">
      {MODULE_ICON_CHOICES.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          title={icon}
          aria-label={icon}
          className={cn(
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors",
            value === icon ? "border-coral-500 bg-coral-50 text-coral-600" : "border-transparent text-navy-500 hover:bg-navy-50",
          )}
        >
          <DynamicIcon name={icon} className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

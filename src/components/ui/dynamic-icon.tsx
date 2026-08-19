import { icons, HelpCircle, type LucideProps } from "lucide-react";

/** Renders a lucide icon looked up by its string name (as stored in CompanyModule.icon, etc). */
export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? HelpCircle;
  return <Icon {...props} />;
}

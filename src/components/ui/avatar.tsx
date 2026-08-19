import { initials, cn } from "@/lib/utils";

const COLORS = ["bg-navy-900", "bg-coral-500", "bg-aqua-600", "bg-navy-600", "bg-coral-700"];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn("flex items-center justify-center rounded-full font-semibold text-white", colorFor(name || "?"), className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name || "?") || "?"}
    </div>
  );
}

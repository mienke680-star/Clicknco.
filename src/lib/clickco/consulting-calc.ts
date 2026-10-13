// Pure values only (no prisma import, no "server-only") so these are safe to
// import from client components -- same split as quote-calc.ts, invoice-calc.ts,
// client-calc.ts, and milestones.ts's projectProgress.

export const DESIGN_FLOW = ["BRIEF", "IN_DESIGN", "APPROVAL", "READY", "DELIVERED"] as const;
export type DesignStatusValue = (typeof DESIGN_FLOW)[number];

export const DESIGN_STATUS_LABEL: Record<DesignStatusValue, string> = {
  BRIEF: "Brief",
  IN_DESIGN: "In design",
  APPROVAL: "Approval",
  READY: "Ready",
  DELIVERED: "Delivered",
};

/** Advance one step, clamped at the end. Ported from hub.js's design-next. */
export function nextDesignStatus(status: DesignStatusValue): DesignStatusValue {
  const i = DESIGN_FLOW.indexOf(status);
  return DESIGN_FLOW[Math.min(i + 1, DESIGN_FLOW.length - 1)]!;
}

export const HEALTH_LABEL = { GROWING: "Growing", ON_TRACK: "On track", NEEDS_ATTENTION: "Needs attention" } as const;
export const HEALTH_TONE: Record<string, string> = { GROWING: "good", ON_TRACK: "info", NEEDS_ATTENTION: "warn" };

export const DESIGN_STATUS_TONE: Record<DesignStatusValue, string> = { BRIEF: "", IN_DESIGN: "info", APPROVAL: "violet", READY: "good", DELIVERED: "" };

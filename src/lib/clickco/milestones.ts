/** Default milestone checklist per package category, ported verbatim from the
 * approved Operations Hub spec (hub.js MILESTONES). Not shown as editable
 * anywhere in that spec -- a static lookup, not a table, used to seed a new
 * Project's ProjectMilestone rows when it's created from an accepted quote. */
export const MILESTONES_BY_CATEGORY: Record<string, string[]> = {
  Websites: [
    "Brief and content received",
    "Sitemap approved",
    "Homepage design approved",
    "Inner pages built",
    "Content loaded",
    "Review build sent",
    "Launch",
  ],
  "Brand + Website": [
    "Discovery session",
    "Logo concepts",
    "Final logo suite",
    "Brand guideline",
    "Website built",
    "Review round",
    "Launch",
  ],
  "Business Starter": ["Discovery session", "Logo and identity", "Website built", "Launch social designs", "Launch"],
  "All-in-one": ["Kick-off", "Brand identity", "Website built", "Launch campaign", "Social and ad designs", "Launch"],
  Marketing: ["Kick-off", "Audit or plan", "Content direction", "Designs delivered", "Monthly review"],
  "Business Design": ["Brief", "First designs", "Revisions", "Final files delivered"],
};

export function defaultMilestonesFor(category: string): string[] {
  return MILESTONES_BY_CATEGORY[category] ?? MILESTONES_BY_CATEGORY["Marketing"]!;
}

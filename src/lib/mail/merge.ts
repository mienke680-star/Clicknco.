import "server-only";

export interface MergeContact {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
}

/** Replaces {{merge_field}} placeholders with a contact's own values. Unknown
 * placeholders are left as-is rather than silently dropped, so a typo is visible. */
export function applyMergeFields(text: string, contact: MergeContact): string {
  const values: Record<string, string> = {
    firstName: contact.firstName,
    lastName: contact.lastName ?? "",
    fullName: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
    email: contact.email ?? "",
    company: contact.company ?? "",
  };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => (key in values ? values[key]! : match));
}

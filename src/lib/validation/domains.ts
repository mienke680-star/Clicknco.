import { z } from "zod";

export const DOMAIN_TYPES = ["PRIMARY", "SUBDOMAIN"] as const;

/** Simple hostname shape check -- labels separated by dots, no leading/trailing hyphens. */
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i;

export const createDomainSchema = z.object({
  companyId: z.string().min(1, "Select a company"),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(255)
    .regex(DOMAIN_PATTERN, "Enter a valid domain, e.g. clients.example.com"),
  type: z.enum(DOMAIN_TYPES).default("SUBDOMAIN"),
});

export const DOMAIN_ACTIONS = ["verify-dns", "fail-dns", "activate-ssl", "set-primary"] as const;

export const domainActionSchema = z.object({
  action: z.enum(DOMAIN_ACTIONS),
});

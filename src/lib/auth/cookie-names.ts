/** Cookie name constants only -- zero other imports. proxy.ts (Edge middleware)
 * needs SESSION_COOKIE but must never pull in session.ts, which is
 * "server-only" and drags in the full Prisma client (Node-only Postgres
 * driver) -- exactly the kind of cross-runtime dependency that breaks Edge
 * Function bundling. Keep this file free of any other import, forever. */
export const SESSION_COOKIE = "cco_session";
export const CSRF_COOKIE = "cco_csrf";

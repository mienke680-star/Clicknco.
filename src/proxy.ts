import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie-names";

// Lightweight, cookie-presence-only checks (per Next.js guidance, Proxy should
// not do DB lookups). Real session validation + RBAC happens in
// requireUser()/requireCompanyContext()/requireSuperAdmin() (src/lib/auth/rbac.ts)
// on every protected server component and API route — this is just an
// optimistic redirect to avoid flashing protected UI at logged-out visitors.
const PROTECTED_PREFIXES = ["/portal", "/admin", "/force-password-change"];
const AUTH_PAGES = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|uploads|favicon.ico|icon.png|.*\\.[\\w]+$).*)"],
};

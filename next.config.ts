import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        // Stops browsers from MIME-sniffing a response into an executable
        // type — defense in depth alongside the upload extension allowlist.
        source: "/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
      {
        // Every API route is either a mutation or a session-scoped read --
        // none of them should ever be cached. Without an explicit no-store,
        // Netlify's edge caches responses by (path, method) alone, ignoring
        // the request body and cookies -- discovered when a cached 401 from
        // an earlier wrong-password login attempt kept being replayed for
        // every subsequent /api/auth/login call regardless of credentials.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

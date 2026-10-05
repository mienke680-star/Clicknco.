import type { NextConfig } from "next";

// Private pages and API responses must never be stored by Netlify's CDN or shared caches:
// they depend on the couple session cookie or a guest's personal invitation token.
const noStore = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "Netlify-CDN-Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // This app lives in its own folder; don't let the parent repository's lockfile become the root.
  turbopack: { root: __dirname },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      // Media sets its own short private cache so video seeking stays smooth.
      { source: "/api/:path((?!media/).*)", headers: noStore },
      { source: "/", headers: noStore },
      { source: "/login", headers: noStore },
      { source: "/setup", headers: noStore },
      { source: "/transfer", headers: noStore },
      { source: "/invite/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;

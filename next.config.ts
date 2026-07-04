import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Schaltet forbidden()/app/forbidden.tsx frei (next/navigation) — genutzt
  // von den Zugriffs-Guards in src/lib/dal.ts und src/app/users/[id]/dal.ts
  // für rollen-/identitätsbasierte Zugriffsverweigerungen.
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true, // 308-Redirect – für SEO und Browser-Cache
      },
      {
        source: "/status",
        destination: "https://stats.uptimerobot.com/3pqHZOOYrY",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

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
      // /home ist jetzt eine echte Seite (src/app/home/page.tsx) statt eines
      // blanken Redirects auf "/" — zeigt eingeloggten Usern das Dashboard,
      // anonymen Besuchern weiterhin die Landingpage (redirect() innerhalb
      // der Seite selbst, nicht mehr hier).
      {
        source: "/status",
        destination: "https://stats.uptimerobot.com/3pqHZOOYrY",
        permanent: true,
      },
      // Profil und Settings sind zusammengeführt (siehe users/[id]/page.tsx)
      // — alte Lesezeichen/Links auf die frühere eigenständige Settings-Seite
      // landen auf der gemeinsamen Profil-Seite (#password/#notifications
      // funktionieren dort unverändert als Sprungmarken).
      {
        source: "/users/:id/settings",
        destination: "/users/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

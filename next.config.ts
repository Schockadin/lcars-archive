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
      // "/" selbst zeigt jetzt je nach Login-Status Dashboard oder
      // Landingpage (siehe page.tsx) — /home bleibt als reiner Redirect für
      // alte Links/Lesezeichen bestehen, die eigentliche Nav zeigt direkt
      // auf "/" (siehe MAIN_NAV in src/lib/nav.ts).
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
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

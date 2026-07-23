import type { NextConfig } from "next";

// Statische CSP ohne Nonce (bewusste Entscheidung, siehe Rückfrage): eine
// echte Nonce-CSP bräuchte proxy.ts (Next 16, ehem. middleware.ts) und würde
// ALLE Seiten auf dynamic rendering zwingen — auch missions/[missionSlug]/
// page.tsx, die einzige bewusst statische Seite (generateStaticParams). Ohne
// Nonce bleibt script-src auf 'unsafe-inline' angewiesen: Next injiziert bei
// Streaming-SSR (App-Router-Default) selbst Inline-<script>-Tags zur
// progressiven Hydration, ein 'self'-only script-src bricht die Seite ohne
// Nonce komplett. style-src braucht 'unsafe-inline' aus demselben Grund wie
// die zahlreichen style={{...}}-Inline-Styles im Code (CSP kennt für das
// style-HTML-Attribut anders als für <style>-Blöcke keinen Nonce-Mechanismus
// — ein Umbau auf reine CSS-Klassen wäre ein eigenes, größeres Refactoring).
// Trotzdem sinnvolle Härtung: object-src/base-uri/form-action/
// frame-ancestors verhindern klassische Injection-/Clickjacking-Vektoren,
// die von script-src unabhängig sind. img-src bleibt bewusst weit (https:),
// da Charakter-Portraits als freie externe URL aus dem Vault-Frontmatter
// kommen (siehe CharacterPortrait.tsx) — ein enges 'self' würde bestehende
// Portraits als kaputte Bilder anzeigen.
function buildCspHeader(): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    // Netlifys eigenes Deploy-Preview-Toolbar/CDP-Overlay bettet sich selbst
    // per <iframe src="https://app.netlify.com/..."> in JEDEN Deploy-Preview
    // ein (nicht Teil dieser App, von Netlifys Infrastruktur injiziert) —
    // ohne explizites frame-src fällt das auf default-src 'self' zurück und
    // blockiert das Overlay (Konsole: "Refused to frame ... default-src").
    // frame-ancestors weiter unten ist die Gegenrichtung (wer darf UNS
    // einbetten) und bleibt unverändert 'none'.
    "frame-src 'self' https://app.netlify.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  // Schaltet forbidden()/app/forbidden.tsx frei (next/navigation) — genutzt
  // von den Zugriffs-Guards in src/lib/dal.ts, src/app/user/dal.ts und
  // src/app/admin/[id]/dal.ts für rollen-/identitätsbasierte
  // Zugriffsverweigerungen.
  experimental: {
    authInterrupts: true,
    serverActions: {
      // Standard-Limit (1 MB) greift bei Bild-Uploads — erhöht auf 10 MB,
      // da Charakter-Portraits und Content-Bilder typischerweise mehrere MB
      // groß sind (JPEG/PNG-Originale vor R2-Speicherung).
      bodySizeLimit: "10mb",
    },
  },
  // Lighthouse (Best Practices) bemängelte fehlende Source Maps für die
  // ausgelieferten Browser-Bundles — ohne sie zeigt die Fehler-Konsole/
  // Sentry-artiges Tooling nur minifizierten Code. Reine Debugging-Hilfe
  // (referenziert per Kommentar am Ende jeder .js-Datei, kein zusätzlicher
  // Request im normalen Betrieb), kein Laufzeit-Performance-Effekt.
  productionBrowserSourceMaps: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildCspHeader(),
          },
        ],
      },
    ];
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
      // Profil und Settings sind zusammengeführt (siehe user/page.tsx) — alte
      // Lesezeichen/Links auf die frühere eigenständige Settings-Seite landen
      // auf der eigenen (gemeinsamen) Profil-Seite (#password/#notifications
      // funktionieren dort unverändert als Sprungmarken). /user hat kein
      // :id-Segment mehr (die ID kommt aus der Session) — die :id aus dem
      // alten Lesezeichen wird deshalb ignoriert, nicht weitergereicht.
      {
        source: "/users/:id/settings",
        destination: "/user",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

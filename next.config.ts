import type { NextConfig } from "next";

// Statische CSP ohne Nonce (bewusste Entscheidung, siehe Rückfrage): eine
// echte Nonce-CSP bräuchte proxy.ts (Next 16, ehem. middleware.ts) und würde
// ALLE Seiten auf dynamic rendering zwingen — auch chronologie/mission/
// [missionSlug]/page.tsx, die einzige bewusst statische Seite (generateStaticParams). Ohne
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
    // einbetten).
    "frame-src 'self' https://app.netlify.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // 'self' statt 'none': erlaubt der App, EIGENE Ressourcen gleicher Origin
    // einzubetten. Cross-Origin-Framing (der eigentliche Clickjacking-Vektor)
    // bleibt weiterhin geblockt;
    // nur unsere eigenen Seiten dürfen unsere eigenen Seiten rahmen.
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}


// Die Hostnamen, unter denen dieses Deployment erreichbar ist — aus Netlifys
// Umgebungsvariablen (URL, DEPLOY_PRIME_URL, DEPLOY_URL). Lokal ist die Liste
// leer, dort stimmen Origin und Host ohnehin überein.
function netlifyOrigins(): string[] {
  const hosts = new Set<string>();
  for (const value of [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
  ]) {
    if (!value) continue;
    try {
      hosts.add(new URL(value).host);
    } catch {
      // Kein gültiger Wert — dann eben nicht. Eine kaputte Variable darf den
      // Build nicht anhalten.
    }
  }
  return [...hosts];
}

// Netlifys Build-Metadaten in den Build eingebacken: Welcher Kontext
// (production / deploy-preview / branch-deploy), welcher Branch, welcher
// Commit und — bei Previews — welche PR-Nummer. Sie beschreiben den BUILD,
// nicht die Anfrage, und stehen der laufenden Function nicht verlässlich zur
// Verfügung; Next ersetzt process.env.NEO_BUILD_* dagegen beim Build durch
// den Wert (siehe node_modules/next/dist/docs/01-app/03-api-reference/05-config/
// 01-next-config-js/env.md).
//
// Gelesen von src/lib/deployInfo.ts und mit jedem Eintrag ins Fehler-Log
// geschrieben: Sonst ist einem Eintrag nicht anzusehen, ob ihn die aktuelle
// Produktion geworfen hat oder ein Jahre alter Deploy-Permalink, den ein
// Crawler aufgerufen hat (beide sprechen mit derselben Datenbank).
//
// Keine Geheimnisse: Kontext, Branch und Commit-Hash stehen ohnehin öffentlich
// im Repository — nichts davon darf je aus einer Variablen mit Zugangsdaten
// kommen.
function netlifyBuildEnv(): Record<string, string> {
  return {
    NEO_BUILD_CONTEXT: process.env.CONTEXT ?? "",
    NEO_BUILD_BRANCH: process.env.BRANCH ?? "",
    NEO_BUILD_COMMIT: process.env.COMMIT_REF ?? "",
    NEO_BUILD_REVIEW_ID: process.env.REVIEW_ID ?? "",
  };
}

const nextConfig: NextConfig = {
  env: netlifyBuildEnv(),
  // Cache Components (Next 16, ehem. dynamicIO/ppr/useCache als ein Flag):
  // Alle Seiten sind per Default dynamisch; statisch cachebare Teile werden
  // per "use cache"-Direktive markiert (siehe src/lib/*.ts, in denen die
  // früheren unstable_cache-Wrapper auf "use cache" + cacheTag/cacheLife
  // umgestellt sind). Next prerendert daraus eine statische Shell und streamt
  // die dynamischen (betrachter-/cookie-abhängigen) Teile per <Suspense>
  // nach. Ersetzt zugleich die frühere force-dynamic-Route-Segment-Config auf
  // den personalisierten Seiten — Laufzeit-Datenzugriff (cookies()/
  // searchParams) muss dafür in eine Suspense-Grenze gekapselt sein.
  cacheComponents: true,
  // Partial Prefetching (partialPrefetching, Next 16.3) bewusst NICHT
  // aktiviert: In einer Messung auf den Netlify-Previews (PR #97) wurde die
  // App-Shell-Vorab-Anfrage nicht vom CDN gecacht (weckte jedes Mal die
  // Function, wo vorher die Prefetches statischer Routen CDN-Treffer waren),
  // jede HTML-Antwort trug 15–23 KB zusätzliche Seitendaten, und /chronologie
  // wurde messbar langsamer.
  // Schaltet forbidden()/app/forbidden.tsx frei (next/navigation) — genutzt
  // von den Zugriffs-Guards in src/lib/dal.ts, src/app/user/dal.ts und
  // src/app/admin/[id]/dal.ts für rollen-/identitätsbasierte
  // Zugriffsverweigerungen.
  experimental: {
    authInterrupts: true,
    // Turbopack legt seit Next 16.3 auch beim BUILD einen persistenten Cache
    // unter .next/cache/turbopack/ an (vorher nur im Dev-Server). In dessen
    // Segmentdateien landen die zur Compile-Zeit gelesenen Umgebungswerte im
    // Klartext — Netlifys Secret-Scanner fand dort SESSION_SECRET,
    // RESEND_API_KEY, R2_ACCESS_KEY_ID und weitere und brach den Deploy ab.
    //
    // Abgeschaltet statt den Scanner auf diesen Pfad blind zu stellen: Der
    // Fund ist echt, kein Fehlalarm. Der Cache wird zwischen Builds
    // aufgehoben, die Geheimnisse lägen also dauerhaft entschlüsselt in der
    // Build-Infrastruktur — sie gar nicht erst zu schreiben ist die
    // engere Lösung, und sie hält den Scan überall scharf.
    //
    // Preis: Builds starten kalt. Für ein Projekt dieser Größe ist das
    // vertretbar; die Option gehört wieder auf true, sobald Turbopack die
    // Werte nicht mehr im Klartext ablegt.
    turbopackFileSystemCacheForBuild: false,
    serverActions: {
      // Standard-Limit (1 MB) greift bei Bild-Uploads — erhöht auf 10 MB,
      // da Charakter-Portraits und Content-Bilder typischerweise mehrere MB
      // groß sind (JPEG/PNG-Originale vor R2-Speicherung).
      bodySizeLimit: "10mb",
      // Next vergleicht bei jeder Server Action den Origin-Header mit Host
      // bzw. X-Forwarded-Host (CSRF-Schutz, siehe
      // node_modules/next/dist/docs/01-app/02-guides/data-security.md) und
      // antwortet bei Abweichung mit 403 — im Browser als „An unexpected
      // response was received from the server". Hinter Netlifys Proxy können
      // die beiden Werte auseinanderlaufen, vor allem auf Deploy-Previews
      // (…--neo-archiv.netlify.app neben der Hauptdomain). Deshalb die
      // Adressen, unter denen die App wirklich läuft, ausdrücklich erlauben —
      // aus Netlifys eigenen Umgebungsvariablen gelesen (URL = Hauptdomain,
      // DEPLOY_PRIME_URL/DEPLOY_URL = Preview), nicht als Platzhalter:
      // erlaubt wird genau das, was Netlify selbst ausliefert.
      allowedOrigins: netlifyOrigins(),
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
          // Der Browser soll den Typ einer Antwort NICHT erraten, sondern
          // den mitgelieferten Content-Type glauben. Betrifft vor allem die
          // hochgeladenen Bilder (/api/content-images/[id]): Deren Typ kommt
          // aus dem, was der Browser beim Hochladen gemeldet hat (siehe
          // ALLOWED_MIME_TO_EXT in src/lib/contentImages.ts) — ohne nosniff
          // könnte eine als Bild deklarierte Datei mit anderem Inhalt vom
          // Browser umgedeutet werden.
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Beim Verlassen der Seite nur die Herkunft mitgeben, nicht den
          // vollen Pfad: Eine URL wie /dialogues/<slug> verrät sonst über den
          // Referer, welches Gespräch jemand gerade liest.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
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
      // Die Missionsseiten liegen unter der Chronologie (siehe
      // src/lib/contentRoutes.ts) — /missions gibt es nicht mehr. Beide
      // Regeln fangen alte Lesezeichen, Mail-Links und Suchmaschinen-
      // Einträge ab; die Reihenfolge zählt, /missions allein trifft die
      // Wildcard-Regel darunter nicht.
      {
        source: "/missions",
        destination: "/chronologie",
        permanent: true,
      },
      {
        source: "/missions/:path*",
        destination: "/chronologie/mission/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

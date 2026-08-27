import type { Viewport } from "next";
import { Suspense } from "react";
import { Antonio, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import {
  LcarsAppShell,
  LcarsCookieNotice,
  LcarsServiceWorkerRegister,
} from "@/components/lcars";
import ThemeApplier from "@/components/lcars/ThemeApplier";
import { NeoProvider } from "@/context/NeoProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { getCampaignYears } from "@/lib/constants";
import { APP_VERSION } from "@/lib/version";
import { THEME_COOKIE_NAME, THEME_CUSTOM_COOKIE_NAME } from "@/lib/session";
import { TOKEN_IDS } from "@/lib/themes";
import { UI_MODE_COOKIE_NAME, UI_MODE_MINIMAL } from "@/lib/uiMode";

// next/font/google lädt die Font-Dateien zur Build-Zeit herunter und liefert
// sie selbst aus (self-hosted) — keine Laufzeit-Anfrage an Google-Server,
// siehe dazu den entfernten Font-Abschnitt in der Datenschutzerklärung
// (DSGVOContent.tsx).
const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-antonio",
});

// Variablenname MUSS --font-share-tech-mono lauten: genau diesen Namen
// referenzieren die ~25 `font-family: var(--font-share-tech-mono)`-Regeln in
// src/styles/lcars-components/*.css. Hieß hier früher --font-mono-lcars —
// dadurch war die referenzierte Variable nirgends definiert, und da ein
// var() ohne Fallback die gesamte Deklaration ungültig macht ("invalid at
// computed-value time", der `, monospace`-Teil greift dann NICHT), erbten
// alle Mono-Elemente (Metadaten-Zeilen, Akten-Felder, Header, Log-Stubs)
// still die Fließtextschrift statt Share Tech Mono.
const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-share-tech-mono",
});

const campaignYears = getCampaignYears();

export const metadata = {
  title: {
    default: "Neo Archive",
    template: "%s · Neo Archive", // %s wird durch den Seiten-Titel ersetzt
  },
  description: `Kampagnen-Archiv der NeoVerse-Runde – Charaktere, Missionen und Logs aus ${campaignYears} Jahren Pen & Paper.`,
};

export const viewport: Viewport = {
  themeColor: "#08081a",
};

// Setzt Farbtheme + Individualisierung noch vor dem ersten Paint auf <html> —
// ohne serverseitigen Cookie-Lesezugriff, damit das Root-Layout statisch
// prerenderbar bleibt (Cache Components, siehe next.config.ts) und statische
// Seiten (/offline, /_not-found) nicht dynamisch werden.
//   1) neo_theme-Cookie ⇒ data-theme-Attribut (kein Cookie/"standard" ⇒ kein
//      Attribut ⇒ unveränderte :root-Werte aus tokens.css).
//   2) neo_theme_custom-Cookie ("id:hex,id:hex") ⇒ Inline-Style-Overrides für
//      einzelne Akzent-Tokens. Inline-Style auf <html> gewinnt gegen jede
//      Stylesheet-Regel, liegt also über Basis-Theme UND :root — deshalb werden
//      --lcars-<id> UND --color-lcars-<id> gesetzt (letzteres für die
//      Tailwind-Utilities, das die [data-theme]-Spiegelung im Standard-Theme
//      nicht abdeckt). Nur bekannte Token-IDs + gültige Hex werden angewandt.
// Die Cookies sind reine Anzeige-Vorschau; Quelle der Wahrheit sind
// users.color_theme / users.theme_overrides (bei Login/Speichern gespiegelt).
// 3) neo_ui-Cookie ("minimal") ⇒ data-ui="minimal" (kein Cookie/"lcars" ⇒ kein
//    Attribut ⇒ volles LCARS-Design). Aktiviert das schlanke UI (minimal-ui.css)
//    noch vor dem ersten Paint, damit kein LCARS-Chrome aufblitzt.
const THEME_ALLOWED_TOKENS = `{${TOKEN_IDS.map((id) => `"${id}":1`).join(",")}}`;
const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]+)/);var t=m?decodeURIComponent(m[1]):"";if(t&&t!=="standard"){d.setAttribute("data-theme",t);}var a=${THEME_ALLOWED_TOKENS};var c=document.cookie.match(/(?:^|; )${THEME_CUSTOM_COOKIE_NAME}=([^;]+)/);if(c){var p=decodeURIComponent(c[1]).split(",");for(var i=0;i<p.length;i++){var kv=p[i].split(":");var id=kv[0],hx=kv[1];if(a[id]&&/^[0-9a-fA-F]{6}$/.test(hx)){d.style.setProperty("--lcars-"+id,"#"+hx);d.style.setProperty("--color-lcars-"+id,"#"+hx);}}}var u=document.cookie.match(/(?:^|; )${UI_MODE_COOKIE_NAME}=([^;]+)/);if(u&&decodeURIComponent(u[1])==="${UI_MODE_MINIMAL}"){d.setAttribute("data-ui","${UI_MODE_MINIMAL}");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className={`${antonio.variable} ${shareTechMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Läuft als erstes Body-Element noch während des HTML-Parsings, also
            vor dem Paint der App — setzt Farbtheme + Individualisierung aus den
            neo_theme(_custom)-Cookies, damit sie ohne Flackern (FOUC)
            erscheinen. In App-Router-Root-Layouts gehören solche Pre-Paint-
            Skripte in den Body, nicht in einen manuellen <head>
            (Metadata-API-Konflikt). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Hält das Theme über clientseitige Navigationen synchron mit den
            Cookies (v.a. nach Login/Logout, die per redirect() nur soft
            navigieren und das Init-Skript oben nicht erneut auslösen). Nutzt
            usePathname → unter cacheComponents in einer Suspense-Grenze. */}
        <Suspense fallback={null}>
          <ThemeApplier />
        </Suspense>
        <NeoProvider>
          <ToastProvider>
            <LcarsAppShell appVersion={APP_VERSION}>{children}</LcarsAppShell>
            <LcarsCookieNotice />
            <LcarsServiceWorkerRegister />
          </ToastProvider>
        </NeoProvider>
      </body>
    </html>
  );
}

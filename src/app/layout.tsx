import type { Viewport } from "next";
import { Antonio, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import {
  LcarsAppShell,
  LcarsCookieNotice,
  LcarsServiceWorkerRegister,
} from "@/components/lcars";
import { NeoProvider } from "@/context/NeoProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { getCampaignYears } from "@/lib/constants";
import { APP_VERSION } from "@/lib/version";
import { THEME_COOKIE_NAME } from "@/lib/session";

// next/font/google lädt die Font-Dateien zur Build-Zeit herunter und liefert
// sie selbst aus (self-hosted) — keine Laufzeit-Anfrage an Google-Server,
// siehe dazu den entfernten Font-Abschnitt in der Datenschutzerklärung
// (DSGVOClient.tsx).
const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-antonio",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono-lcars",
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

// Setzt das gewählte Farbtheme aus dem (JS-lesbaren) neo_theme-Cookie noch vor
// dem ersten Paint auf <html data-theme="…"> — ohne serverseitigen Cookie-
// Lesezugriff, damit das Root-Layout statisch prerenderbar bleibt (Cache
// Components, siehe next.config.ts) und statische Seiten (/offline,
// /_not-found) nicht dynamisch werden. Kein Cookie bzw. "standard" ⇒ kein
// Attribut ⇒ unveränderte :root-Werte aus tokens.css. Ein ungültiger
// Cookie-Wert matcht keinen Theme-Block und fällt damit optisch ebenfalls auf
// Standard zurück. Das Cookie ist reine Anzeige-Vorschau; Quelle der Wahrheit
// ist users.color_theme (wird beim Login/Speichern ins Cookie gespiegelt).
const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]+)/);var t=m?decodeURIComponent(m[1]):"";if(t&&t!=="standard"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

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
            vor dem Paint der App — setzt data-theme aus dem neo_theme-Cookie,
            damit das gewählte Farbtheme ohne Flackern (FOUC) erscheint. In
            App-Router-Root-Layouts gehören solche Pre-Paint-Skripte in den
            Body, nicht in einen manuellen <head> (Metadata-API-Konflikt). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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

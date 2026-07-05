import type { Viewport } from "next";
import { Antonio, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import {
  LcarsAppShell,
  LcarsCookieNotice,
  LcarsServiceWorkerRegister,
} from "@/components/lcars";
import { NeoProvider } from "@/context/NeoProvider";
import { getCampaignYears } from "@/lib/constants";
import { APP_VERSION } from "@/lib/version";

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
        <NeoProvider>
          <LcarsAppShell appVersion={APP_VERSION}>{children}</LcarsAppShell>
          <LcarsCookieNotice />
          <LcarsServiceWorkerRegister />
        </NeoProvider>
      </body>
    </html>
  );
}

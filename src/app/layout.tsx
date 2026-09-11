import type { Viewport } from "next";
import { Suspense } from "react";
import {
  Antonio,
  Share_Tech_Mono,
  Inter,
  Roboto,
  Open_Sans,
  JetBrains_Mono,
  Roboto_Mono,
  Source_Code_Pro,
} from "next/font/google";
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
import { OVERRIDE_TOKEN_VARS } from "@/lib/themes";
import {
  UI_MODE_COOKIE_NAME,
  UI_MODE_MINIMAL,
  UI_MODE_MINIMAL_LIGHT_LEGACY,
} from "@/lib/uiMode";
import { COLOR_MODE_COOKIE_NAME, COLOR_MODE_LIGHT } from "@/lib/colorMode";
import {
  FONT_SANS_COOKIE_NAME,
  FONT_MONO_COOKIE_NAME,
  DEFAULT_FONT_SANS,
  DEFAULT_FONT_MONO,
  FONT_SANS_OPTIONS,
  FONT_MONO_OPTIONS,
} from "@/lib/fonts";

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

// Die wählbaren Alternativen zu den beiden Vorgaben (Profil → Darstellung →
// Schriften, Registry in src/lib/fonts.ts). Auch sie kommen über next/font
// und werden mit ausgeliefert — keine Laufzeit-Anfrage an Google, wie im
// Kommentar oben und in der Datenschutzerklärung beschrieben.
//
// preload: false ist hier wichtig: ihre Variablen liegen zwar auf jeder Seite
// an <html> an (sonst könnte fonts.css sie nicht auflösen), aber nur eine
// davon wird tatsächlich benutzt. Ohne dieses Flag lüde jeder Seitenaufruf
// alle sieben Schriften vorab. So deklariert der Build nur die @font-face-
// Regeln; die Datei holt der Browser erst, wenn die Wahl sie wirklich
// anzieht. Alle Alternativen sind Variable Fonts — deshalb ohne weight.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  preload: false,
});
const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  preload: false,
});
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  preload: false,
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  preload: false,
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  preload: false,
});
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
  preload: false,
});

// Alle Schrift-Variablen zusammen auf <html> — die Vorgaben und die
// Alternativen, damit fonts.css die gewählte auflösen kann.
const FONT_VARIABLES = [
  antonio.variable,
  shareTechMono.variable,
  inter.variable,
  roboto.variable,
  openSans.variable,
  jetBrainsMono.variable,
  robotoMono.variable,
  sourceCodePro.variable,
].join(" ");

const campaignYears = getCampaignYears();

export const metadata = {
  title: {
    default: "Neo Archive",
    template: "%s · Neo Archive", // %s wird durch den Seiten-Titel ersetzt
  },
  description: `Kampagnen-Datenbank der NeoVerse-Runde – Charaktere, Missionen und Logs aus ${campaignYears} Jahren Pen & Paper.`,
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
// 4) neo_font_sans-/neo_font_mono-Cookie ⇒ data-font-sans/data-font-mono
//    (kein Cookie bzw. die Vorgabe ⇒ kein Attribut ⇒ Antonio/Share Tech Mono
//    aus tokens.css). Hängt die beiden kanonischen Schrift-Stacks um, siehe
//    src/styles/fonts.css. Nur bekannte IDs werden gesetzt — ein manipuliertes
//    Cookie kann damit nichts als ein gültiges Attribut erzeugen.
// id → [css-var-Suffixe] (Akzent-Tokens 1:1, bg/ink ggf. mehrere), damit ein
// Override dieselben Variablen setzt wie die Client-Vorschau (siehe
// OVERRIDE_TOKEN_VARS in src/lib/themes.ts).
const THEME_TOKEN_VARS = JSON.stringify(OVERRIDE_TOKEN_VARS);
// Die erlaubten Schrift-IDs als Literal ins Skript — dieselbe Registry wie
// überall (src/lib/fonts.ts), nur ohne Import zur Laufzeit.
const FONT_SANS_IDS = JSON.stringify(
  FONT_SANS_OPTIONS.filter((option) => option.id !== DEFAULT_FONT_SANS).map(
    (option) => option.id,
  ),
);
const FONT_MONO_IDS = JSON.stringify(
  FONT_MONO_OPTIONS.filter((option) => option.id !== DEFAULT_FONT_MONO).map(
    (option) => option.id,
  ),
);
const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]+)/);var t=m?decodeURIComponent(m[1]):"";if(t&&t!=="standard"){d.setAttribute("data-theme",t);}var V=${THEME_TOKEN_VARS};var c=document.cookie.match(/(?:^|; )${THEME_CUSTOM_COOKIE_NAME}=([^;]+)/);if(c){var p=decodeURIComponent(c[1]).split(",");for(var i=0;i<p.length;i++){var kv=p[i].split(":");var id=kv[0],hx=kv[1];if(V[id]&&/^[0-9a-fA-F]{6}$/.test(hx)){var s=V[id];for(var j=0;j<s.length;j++){d.style.setProperty("--lcars-"+s[j],"#"+hx);d.style.setProperty("--color-lcars-"+s[j],"#"+hx);}}}}var u=document.cookie.match(/(?:^|; )${UI_MODE_COOKIE_NAME}=([^;]+)/);var uv=u?decodeURIComponent(u[1]):"";if(uv==="${UI_MODE_MINIMAL}"||uv==="${UI_MODE_MINIMAL_LIGHT_LEGACY}"){d.setAttribute("data-ui","${UI_MODE_MINIMAL}");}var g=document.cookie.match(/(?:^|; )${COLOR_MODE_COOKIE_NAME}=([^;]+)/);var gv=g?decodeURIComponent(g[1]):"";if(gv==="${COLOR_MODE_LIGHT}"||uv==="${UI_MODE_MINIMAL_LIGHT_LEGACY}"){d.setAttribute("data-mode","${COLOR_MODE_LIGHT}");}var fs=document.cookie.match(/(?:^|; )${FONT_SANS_COOKIE_NAME}=([^;]+)/);var fsv=fs?decodeURIComponent(fs[1]):"";if(${FONT_SANS_IDS}.indexOf(fsv)>-1){d.setAttribute("data-font-sans",fsv);}var fm=document.cookie.match(/(?:^|; )${FONT_MONO_COOKIE_NAME}=([^;]+)/);var fmv=fm?decodeURIComponent(fm[1]):"";if(${FONT_MONO_IDS}.indexOf(fmv)>-1){d.setAttribute("data-font-mono",fmv);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={FONT_VARIABLES} suppressHydrationWarning>
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

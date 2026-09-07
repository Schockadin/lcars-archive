"use client";
import { useNeo } from "@/hooks/useNeo";
import LcarsHeader from "./Header";
import LcarsSidebar from "./Sidebar";
import LcarsMainContent from "./MainContent";
import LcarsFooter from "./Footer";

// Grundgerüst der App. Liegt innerhalb des NeoProviders, damit der Lesemodus
// (nur mobil) per Klasse die LCARS-Chrome ausblenden kann.
export default function AppShell({
  children,
  appVersion,
}: {
  children: React.ReactNode;
  appVersion: string | null;
}) {
  const { readingMode } = useNeo();

  return (
    <div
      className={`lcars-appshell flex w-full h-[100svh]${readingMode ? " reading-mode" : ""}`}
    >
      {/* Sprungmarke für Tastatur- und Screenreader-Nutzung: erstes
          fokussierbares Element der Seite, sichtbar nur solange es den Fokus
          hat (siehe .lcars-skip-link). Ohne sie muss man sich vor jedem Inhalt
          erst durch die komplette Seitenleiste tabben. */}
      <a href="#lcars-main" className="lcars-skip-link">
        Zum Inhalt springen
      </a>
      <LcarsSidebar />
      <div
        className="lcars-appshell-main flex flex-col flex-1 h-full overflow-clip"
        style={{ minWidth: 0 }}
      >
        <LcarsHeader />
        <LcarsMainContent>{children}</LcarsMainContent>
        <LcarsFooter appVersion={appVersion} />
      </div>
    </div>
  );
}

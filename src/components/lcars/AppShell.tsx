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
      className={`flex w-full h-[100svh]${readingMode ? " reading-mode" : ""}`}
    >
      <LcarsSidebar />
      <div
        className="flex flex-col flex-1 h-full overflow-clip"
        style={{ minWidth: 0 }}
      >
        <LcarsHeader />
        <LcarsMainContent>{children}</LcarsMainContent>
        <LcarsFooter appVersion={appVersion} />
      </div>
    </div>
  );
}

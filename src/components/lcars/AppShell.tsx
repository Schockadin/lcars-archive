"use client";
import { useNeo } from "@/hooks/useNeo";
import LcarsHeader from "./Header";
import LcarsSidebar from "./Sidebar";
import LcarsMainContent from "./MainContent";
import LcarsFooter from "./Footer";

// Grundgerüst der App. Liegt innerhalb des NeoProviders, damit der Lesemodus
// (nur mobil) per Klasse die LCARS-Chrome ausblenden kann.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { readingMode } = useNeo();

  return (
    <div
      className={`flex w-full h-[100dvh]${readingMode ? " reading-mode" : ""}`}
    >
      <LcarsSidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <LcarsHeader />
        <LcarsMainContent>{children}</LcarsMainContent>
        <LcarsFooter />
      </div>
    </div>
  );
}

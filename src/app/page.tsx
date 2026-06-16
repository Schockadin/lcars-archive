'use client'
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Home() {
  usePageMeta("NeoVerse Archiv", "home");
  return (
    <main>
      {/* MAIN CONTENT AREA */}
      NeoVerse Archiv
    </main>
  );
}
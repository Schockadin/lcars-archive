"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// AppShell sperrt html/body auf overflow:hidden (siehe globals.css) — nur
// .lcars-main-content scrollt. Next.js' eingebautes Scroll-zu-Hash nach
// Link-Navigation prüft dabei aber offenbar die Scrollbarkeit des Fensters
// und tut bei clientseitiger Navigation nichts, wenn das für nicht nötig
// hält (Fenster selbst hat ja keinen Overflow mehr). Deshalb hier von Hand:
// nach jeder Routenänderung den aktuellen #hash in .lcars-main-content in
// den sichtbaren Bereich scrollen (funktioniert, weil das jetzt der einzige
// scrollbare Vorfahre ist).
export default function HashScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ block: "start" });
  }, [pathname]);

  return null;
}

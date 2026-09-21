"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const DASHBOARD_REFRESH_INTERVAL_MS = 10_000;

// Hält die angemeldete Startseite aktuell, ohne dass jemand neu laden muss:
// alle zehn Sekunden ein router.refresh(). Die Seite zeigt lauter Dinge, die
// sich woanders ändern — Zu- und Absagen zum nächsten Spielabend, neue
// Nachrichten in offenen Gesprächen, News der anderen, die eigenen Entwürfe
// —, und bis hierher sah man das erst beim nächsten Aufruf.
//
// router.refresh() statt eines eigenen Poll-Endpunkts (wie in
// DialogueLiveView, das einen Snapshot holt): Die Startseite besteht aus
// einem Dutzend unabhängiger Abschnitte, für die es keinen gemeinsamen
// Snapshot gibt. Der Refresh holt genau das, was die Seite ohnehin rendert,
// und er ist WEICH — die bestehende Oberfläche bleibt stehen, bis die neuen
// Daten da sind. Kein Flackern, kein Sprung, und der Zustand der
// Client-Teile bleibt erhalten: aufgeklappte Abschnitte, ein offenes
// Anlege-Fenster samt bereits getippten Feldern.
//
// Pausiert bei unsichtbarem Tab und holt beim Zurückkehren sofort frische
// Daten — dasselbe Muster wie der Dialog-Poll. Das ist hier nicht nur Kosmetik:
// „/" ist die meistbesuchte Seite der Anwendung, ein Refresh rendert sie
// vollständig neu (also je eingeschalteter Sektion ihre Abfragen), und ein
// vergessener Hintergrund-Tab liefe sonst tagelang im Zehn-Sekunden-Takt
// gegen die Datenbank. Wer wenig sehen will, zahlt ohnehin wenig: Was im
// Profil abgeschaltet ist, wird auch beim Refresh nicht geladen (siehe
// Dashboard.tsx).
//
// Rendert nichts — die Komponente ist nur der Träger des Effekts.
export default function DashboardAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) router.refresh();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}

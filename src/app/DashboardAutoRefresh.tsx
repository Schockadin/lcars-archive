"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeUpdates } from "@/components/RealtimeUpdatesProvider";

export const DASHBOARD_REFRESH_INTERVAL_MS = 10_000;

// Die RealtimeUpdatesProvider hält die Startseite über WebSockets aktuell.
// Dieses Intervall ist nur der Rückfallweg, falls Ably nicht konfiguriert oder
// gerade nicht erreichbar ist.
//
// Die Startseite besteht aus vielen unabhängigen Abschnitten. router.refresh()
// lädt dafür nach einem WebSocket-Signal genau das erneut, was die Seite
// ohnehin rendert, und tauscht es weich aus: aufgeklappte Abschnitte und
// offene Formulare samt Eingaben bleiben erhalten. Der Rückfall-Poll pausiert
// bei unsichtbarem Tab; beim Zurückkehren wird sofort aktualisiert.
//
// Rendert nichts — die Komponente ist nur der Träger des Effekts.
export default function DashboardAutoRefresh() {
  const router = useRouter();
  const { connected } = useRealtimeUpdates();

  useEffect(() => {
    if (connected) return;

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
  }, [connected, router]);

  return null;
}

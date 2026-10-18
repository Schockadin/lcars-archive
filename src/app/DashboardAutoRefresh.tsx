"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeUpdates } from "@/components/RealtimeUpdatesProvider";

export const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;
export const DASHBOARD_REFRESH_MAX_INTERVAL_MS = 120_000;

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

    let interval = DASHBOARD_REFRESH_INTERVAL_MS;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function scheduleRefresh() {
      if (document.hidden) return;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (document.hidden) return;
        router.refresh();
        interval = Math.min(interval * 2, DASHBOARD_REFRESH_MAX_INTERVAL_MS);
        scheduleRefresh();
      }, interval);
    }

    scheduleRefresh();

    function handleVisibilityChange() {
      if (document.hidden) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        return;
      }

      interval = DASHBOARD_REFRESH_INTERVAL_MS;
      router.refresh();
      if (timeoutId) clearTimeout(timeoutId);
      scheduleRefresh();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connected, router]);

  return null;
}

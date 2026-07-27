"use client";
import { useEffect } from "react";
import type { TimelineSourceType } from "@/types/timeline";

// Meldet beim Aufruf einer Inhalts-Detailseite an /api/news/seen, dass dieser
// Inhalt „gesehen" wurde — damit verschwindet eine offene News dazu aus dem
// Dashboard-Feed (siehe recentActivity.ts / news_seen). Rendert nichts.
// Bewusst client-seitig per fetch (statt serverseitig in der Seite), damit die
// Detailseite statisch/gecacht bleibt und nicht pro Betrachter dynamisch wird.
// Für nicht eingeloggte Besucher ist der Endpoint ein stiller No-op.
export default function MarkNewsSeen({
  type,
  slug,
}: {
  type: TimelineSourceType;
  slug: string;
}) {
  useEffect(() => {
    void fetch("/api/news/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, slug }),
      keepalive: true,
    }).catch(() => {
      // Best-effort — ein fehlgeschlagenes „gesehen"-Signal ist unkritisch.
    });
  }, [type, slug]);

  return null;
}

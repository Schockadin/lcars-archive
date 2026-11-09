"use client";

import { useEffect, useRef } from "react";
import type { ContentViewType } from "@/lib/contentViewTypes";

// Markiert erst nach dem Hydrieren einen echten Seitenaufruf. So zählen
// Next.js-Link-Prefetches und reine Server-Renderings nicht als Ansichten.
export default function ContentViewTracker({
  contentType,
  slug,
}: {
  contentType: ContentViewType;
  slug: string;
}) {
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const key = `${contentType}:${slug}`;
    // React Strict Mode führt Effects in der Entwicklung erneut aus.
    if (lastSent.current === key) return;
    lastSent.current = key;

    void fetch("/api/content-views", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, slug }),
    }).catch(() => {
      // Statistik ist nicht seitenkritisch; ein fehlgeschlagener Aufruf darf
      // die Inhaltsseite weder blockieren noch eine Fehlermeldung auslösen.
    });
  }, [contentType, slug]);

  return null;
}

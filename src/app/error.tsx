"use client";
import ServerErrorContent from "./_shared/ServerErrorContent";

// Fängt Fehler in jedem Routen-Segment außer dem Root-Layout selbst ab
// (dafür siehe global-error.tsx) — muss Client Component sein
// (Next.js-Vorgabe für Fehlergrenzen). unstable_retry() ist seit Next.js
// 16.2 der empfohlene Weg (fetcht den Segment-Inhalt neu statt nur den
// Fehlerzustand zu löschen, siehe node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/error.md).
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ServerErrorContent error={error} onRetry={unstable_retry} />;
}

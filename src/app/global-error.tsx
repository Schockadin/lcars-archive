"use client";
import { antonio, shareTechMono } from "./font-definitions";
import "./globals.css";
import ServerErrorContent from "./_shared/ServerErrorContent";

// Fängt Fehler im Root-Layout selbst ab und ersetzt dabei das Root-Layout
// komplett. Die Fehlerseite bleibt bewusst minimal; Schriftdefinitionen
// werden mit dem normalen Layout geteilt.

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="de" className={`${antonio.variable} ${shareTechMono.variable}`}>
      <body>
        <ServerErrorContent error={error} onRetry={unstable_retry} />
      </body>
    </html>
  );
}

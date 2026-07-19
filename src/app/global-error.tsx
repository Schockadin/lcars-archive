"use client";
import { Antonio, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import ServerErrorContent from "./_shared/ServerErrorContent";

// Fängt zusätzlich Fehler im Root-Layout selbst ab (layout.tsx), die ein
// normales error.tsx NICHT abdeckt — ersetzt dabei das Root-Layout
// komplett, muss deshalb eigene <html>/<body>-Tags mitbringen (kein
// Layout-Erbe möglich, kein metadata-Export erlaubt, siehe Next.js-Doku).
// Bewusst OHNE LcarsAppShell/NeoProvider/ServiceWorker — genau diese
// könnten die Ursache des Root-Layout-Fehlers sein, die Fehlerseite muss
// so minimal wie möglich bleiben, um selbst nicht erneut zu crashen. Fonts
// + globals.css trotzdem importiert, damit die LCARS-Optik erhalten bleibt.
const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-antonio",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono-lcars",
});

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html
      lang="de"
      className={`${antonio.variable} ${shareTechMono.variable}`}
    >
      <body>
        <ServerErrorContent error={error} onRetry={unstable_retry} />
      </body>
    </html>
  );
}

"use client";
import { useEffect, useState } from "react";
import { LcarsMenuItem } from "@/components/lcars";

// Geteiltes Inhalts-JSX zwischen src/app/error.tsx und src/app/global-error.tsx
// (Next.js verlangt für global-error.tsx einen eigenen <html>/<body>-Rahmen,
// der Inhalt selbst soll aber identisch sein — deshalb hier ausgelagert,
// statt ihn zweimal zu pflegen). Gleiches LCARS-Styling wie not-found.tsx,
// nur mit "500" statt "404" und einem zusätzlichen, admin-only
// Detail-Bereich.
//
// Sicherheitsprinzip (siehe auch Next.js' eigene Redigierung der
// Fehlermeldung bei Server-Component-Fehlern): ALLE Besucher sehen nur
// diese freundliche Meldung plus — falls vorhanden — den Referenzcode
// (error.digest). Die volle Meldung/Stacktrace wird erst nachgeladen, wenn
// der Client-seitige Admin-Check (/api/session, liest die Rolle direkt aus
// dem signierten Session-Cookie, kein DB-Zugriff nötig) positiv ausfällt —
// UND erst dann per zusätzlichem Fetch gegen /api/errors/[digest], das
// serverseitig nochmal denselben Check macht (defensiv, falls der
// Client-Check je manipuliert würde).
interface ErrorDetail {
  message: string;
  stack: string | null;
  routePath: string | null;
  routeType: string | null;
  createdAt: string;
}

export default function ServerErrorContent({
  error,
  onRetry,
}: {
  error: Error & { digest?: string };
  onRetry: () => void;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [detail, setDetail] = useState<ErrorDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminDetail() {
      try {
        const sessionRes = await fetch("/api/session", { cache: "no-store" });
        const session = await sessionRes.json();
        if (cancelled || session.role !== "admin") return;
        setIsAdmin(true);

        if (error.digest) {
          const res = await fetch(`/api/errors/${error.digest}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const json = await res.json();
            if (!cancelled) setDetail(json);
          }
        } else {
          // Client-Component-Fehler: error.message/stack liegen hier schon
          // im Klartext vor (Next.js redigiert nur Server-Component-Fehler),
          // kein Fetch nötig.
          if (!cancelled) {
            setDetail({
              message: error.message,
              stack: error.stack ?? null,
              routePath: null,
              routeType: null,
              createdAt: "",
            });
          }
        }
      } catch {
        // Admin-Check/Detail-Abruf fehlgeschlagen (z.B. DB selbst nicht
        // erreichbar) — Seite bleibt defensiv bei der freundlichen Meldung.
      }
    }

    // Kein externer Store, sondern ein asynchroner Fetch beim Mount (Session-
    // /Detail-Abruf) — useSyncExternalStore (die Empfehlung der Regel) passt
    // hier nicht, da es einen synchronen Snapshot erwartet.
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-external-store-subscription
    loadAdminDetail();
    return () => {
      cancelled = true;
    };
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-[16px] pt-[80px] px-8 text-center">
      {/* Fehlercode – groß und in LCARS-Amber */}
      <div
        className="font-lcars-mono uppercase tracking-widest text-lcars-primary-ink"
        style={{
          fontSize: "clamp(64px, 12vw, 160px)",
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        500
      </div>

      {/* Statuszeile wie ein LCARS-Systemmeldung */}
      <div className="uppercase tracking-[0.2em] text-sm text-lcars-ink-data">
        FEHLER // SYSTEMSTÖRUNG
      </div>

      {/* Trennbalken im LCARS-Stil */}
      <div className="flex gap-[4px] w-full max-w-[400px] h-[8px]">
        <div className="flex-1 bg-lcars-secondary" />
        <div className="w-[32px] bg-lcars-primary" />
        <div className="flex-1 bg-lcars-tertiary" />
      </div>

      {/* Kurze Erklärung */}
      <p
        className="max-w-[var(--lcars-content-w)] leading-relaxed text-lcars-ink"
        style={{ fontSize: "16px" }}
      >
        Bei der Verarbeitung ist ein unerwarteter Fehler aufgetreten. Die
        Administration wurde automatisch benachrichtigt.
        {error.digest && !detail && (
          <>
            <br />
            Fehler-Referenz: <code>{error.digest}</code>
          </>
        )}
      </p>

      {isAdmin && detail && (
        <details className="w-full max-w-[var(--lcars-content-w)] text-left">
          <summary className="cursor-pointer text-lcars-primary-ink text-[13px]">
            Fehlerdetails (nur für Administration sichtbar)
          </summary>
          <div className="mt-[8px] flex flex-col gap-[6px] text-[12px]">
            {detail.routePath && (
              <p className="text-lcars-ink-data">
                Route: {detail.routePath} ({detail.routeType})
              </p>
            )}
            <pre className="overflow-x-auto rounded-[8px] border border-lcars-border bg-lcars-surface-2 p-[12px] font-mono text-lcars-ink-contrast whitespace-pre-wrap">
              {detail.message}
              {detail.stack ? `\n\n${detail.stack}` : ""}
            </pre>
          </div>
        </details>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-[12px]">
        <button
          type="button"
          onClick={onRetry}
          className="lcars-pill-btn--outline"
        >
          Erneut versuchen
        </button>
        <LcarsMenuItem
          href="/"
          id="zurück"
          type="pill"
          style={{
            height: "40px",
            width: "200px",
            justifyContent: "center",
            alignItems: "center",
            padding: "0",
          }}
        />
      </div>
    </div>
  );
}

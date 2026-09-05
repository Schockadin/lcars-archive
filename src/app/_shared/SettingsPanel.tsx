import type { ReactNode } from "react";

// Aufklappbarer Abschnitt für längere Einstellungslisten (z.B. die
// Farbauswahl im Profil): Kopfzeile mit Chevron, Titel und optionaler
// Kurzinfo rechts; der Inhalt erscheint erst beim Aufklappen.
//
// Bewusst natives <details> statt eigenem State — kein zusätzliches
// Client-Bundle, und die Panels funktionieren auch ohne JS. Dasselbe Muster
// wie „Alle Buchungen" unter /gm/ap (siehe .lcars-details* in shared.css).
export default function SettingsPanel({
  title,
  hint,
  badge,
  defaultOpen = false,
  stacked = false,
  children,
}: {
  title: string;
  // Einzeiler unter dem Titel — erklärt, was der Abschnitt einstellt.
  hint?: string;
  // Kurzinfo rechts in der Kopfzeile, z.B. „3 eigene Farben".
  badge?: ReactNode;
  defaultOpen?: boolean;
  // Kopfzeile untereinander statt nebeneinander. In breiten Panels stand die
  // Kurzinfo sonst am äußersten rechten Rand — hunderte Pixel von dem Titel
  // entfernt, zu dem sie gehört.
  stacked?: boolean;
  children: ReactNode;
}) {
  const heading = (
    <>
      <span
        className="lcars-data-row-chevron"
        style={{ margin: "0 4px 0 2px" }}
        aria-hidden="true"
      />
      <span className="lcars-eyebrow text-lcars-primary-ink">{title}</span>
    </>
  );

  return (
    <details
      className="lcars-details rounded-[var(--lcars-radius-pill)] border border-lcars-border bg-lcars-surface px-[16px] py-[10px]"
      open={defaultOpen}
    >
      {stacked ? (
        <summary className="lcars-details-summary lcars-details-summary--stacked">
          {/* Chevron und Titel bleiben zusammen in einer Zeile — sonst stünde
              das Dreieck allein über der Überschrift. */}
          <span className="flex items-center gap-[6px]">{heading}</span>
          {hint && (
            <span className="text-lcars-ink-dim text-[12px]">{hint}</span>
          )}
          {badge && (
            <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
              {badge}
            </span>
          )}
        </summary>
      ) : (
        <summary className="lcars-details-summary">
          <span
            className="lcars-data-row-chevron"
            style={{ margin: "0 4px 0 2px" }}
            aria-hidden="true"
          />
          <span className="flex flex-1 flex-col">
            <span className="lcars-eyebrow text-lcars-primary-ink">{title}</span>
            {hint && (
              <span className="text-lcars-ink-dim text-[12px]">{hint}</span>
            )}
          </span>
          {badge && (
            <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
              {badge}
            </span>
          )}
        </summary>
      )}
      <div className="mt-[12px] flex flex-col gap-[10px]">{children}</div>
    </details>
  );
}

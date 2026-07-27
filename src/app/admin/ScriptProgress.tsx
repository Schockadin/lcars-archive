"use client";
import type { ReactNode } from "react";

// Gemeinsamer Fortschrittsbalken für die Admin-Scripts (Bulk-Autolinking,
// Gespräche-Fließtext, Missionen zuordnen). Rechts ein kleines rotes X, um die
// Anzeige (Balken + Text) auszublenden — z.B. nachdem ein Lauf fertig ist.
export default function ScriptProgress({
  pct,
  caption,
  onDismiss,
}: {
  pct: number;
  caption?: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex flex-col gap-[4px]">
      <div className="flex items-center gap-[8px]">
        <div
          className="lcars-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="lcars-progress-bar" style={{ width: `${pct}%` }} />
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Ausblenden"
            title="Ausblenden"
            className="text-lcars-red leading-none text-[18px] shrink-0 px-[6px]"
          >
            ×
          </button>
        )}
      </div>
      {caption && (
        <p className="text-lcars-text-dim text-[12px]">{caption}</p>
      )}
    </div>
  );
}

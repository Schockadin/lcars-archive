"use client";
import { useState } from "react";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { createPortal } from "react-dom";
import { XIcon } from "@/lib/icons";
import { useReturnFocus } from "@/hooks/useReturnFocus";

// Fenster mit einem freien Eingabefeld — das Hinzufügen zu den Listen des
// Charakterbogens (Werte, Schwerpunkte, Angriffe, Ausrüstung,
// Karriere-Ereignisse, Hobbys). Gleiches Overlay-Muster wie
// TalentPicker/RowDetailModal (Portal, Escape schließt, Klick daneben
// schließt, Scroll-Sperre).
//
// Die Liste selbst rendert der Bogen (CharacterStatsForm): dort stehen die
// Einträge als beschriebene Zeilen im jeweiligen Kasten.
export default function EntryAddModal({
  title,
  placeholder,
  hint,
  onAdd,
  onClose,
}: {
  title: string;
  placeholder: string;
  hint?: string;
  onAdd: (entry: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  useReturnFocus(true);

  useOverlayDismiss(onClose);

  function submit() {
    const entry = value.trim();
    if (!entry) return;
    onAdd(entry);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[520px] flex-col gap-[12px] rounded-[8px] border border-lcars-border bg-lcars-surface p-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <h2 className="text-lcars-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="lcars-icon-btn"
            aria-label="Schließen"
          >
            <XIcon />
          </button>
        </div>

        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Eintrag</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            // Enter im Fenster übernimmt — das umgebende Formular des
            // Charakterbogens darf dabei nicht abgeschickt werden.
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="lcars-input rounded-full w-full"
            autoFocus
          />
        </label>
        {hint && <p className="text-lcars-ink-dim text-[12px]">{hint}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Übernehmen
        </button>
      </div>
    </div>,
    document.body,
  );
}

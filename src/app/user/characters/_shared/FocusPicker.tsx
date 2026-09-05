"use client";
import { useMemo, useState } from "react";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { createPortal } from "react-dom";
import { XIcon } from "@/lib/icons";
import { useReturnFocus } from "@/hooks/useReturnFocus";
import {
  FOCUS_DISCIPLINES,
  FOCUS_DISCIPLINE_LABELS,
  focusDisciplineLabel,
  focusKey,
  type Focus,
} from "@/lib/focusCatalog";

// Schwerpunkt-Auswahl aus dem Katalog (gepflegt unter /gm/focuses). Genutzt
// vom Steigern-Panel und vom Werte-Formular des Charakterbogens — deshalb
// eine gemeinsame Komponente, wie TalentPicker.tsx, dessen Overlay-Muster sie
// übernimmt (Portal, Escape schließt, Klick daneben schließt, Scroll-Sperre).
//
// Gespeichert wird nur der NAME. Sechs Schwerpunkte führt der Regeltext in
// zwei Disziplinen („Astrophysics" bei Steuerung und Wissenschaft, …); für
// den Bogen sind das derselbe Eintrag. Die Liste fasst sie deshalb zu einer
// Zeile zusammen und zeigt beide Disziplinen daneben.

interface PickerEntry {
  name: string;
  disciplines: string[];
  descriptions: string[];
}

// Katalogzeilen zu Einträgen je NAME zusammenfassen — in der Reihenfolge, in
// der listFocuses sie liefert (Disziplin, dann alphabetisch).
export function mergeByName(focuses: Focus[]): PickerEntry[] {
  const byKey = new Map<string, PickerEntry>();
  for (const focus of focuses) {
    const key = focusKey(focus.name);
    const entry = byKey.get(key);
    const label = focusDisciplineLabel(focus.discipline);
    if (entry) {
      if (!entry.disciplines.includes(label)) entry.disciplines.push(label);
      if (focus.description) entry.descriptions.push(focus.description);
    } else {
      byKey.set(key, {
        name: focus.name,
        disciplines: [label],
        descriptions: focus.description ? [focus.description] : [],
      });
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function FocusModal({
  focuses,
  taken,
  cost,
  affordable,
  onPick,
  onClose,
}: {
  focuses: Focus[];
  // Einträge, die schon auf dem Bogen stehen — sie fehlen in der Auswahl.
  taken: string[];
  // Was der Schwerpunkt kostet (Steigern) — null während der Ersterschaffung,
  // wo Schwerpunkte aus dem Freikontingent kommen.
  cost: number | null;
  // false = die Kosten sind nicht gedeckt; das Übernehmen ist dann gesperrt.
  affordable: boolean;
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState("");

  useReturnFocus(true);
  useOverlayDismiss(onClose);

  const takenKeys = useMemo(
    () => new Set(taken.map(focusKey)),
    [taken],
  );

  // Der Disziplin-Filter arbeitet auf den Katalogzeilen (dort hängt die
  // Disziplin), zusammengefasst wird erst danach.
  const entries = useMemo(() => {
    const filtered = discipline
      ? focuses.filter((f) => f.discipline === discipline)
      : focuses;
    return mergeByName(filtered);
  }, [focuses, discipline]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (takenKeys.has(focusKey(entry.name))) return false;
      if (!needle) return true;
      return (
        entry.name.toLowerCase().includes(needle) ||
        entry.descriptions.some((d) => d.toLowerCase().includes(needle))
      );
    });
  }, [entries, takenKeys, query]);

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label="Schwerpunkt wählen"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[760px] flex-col gap-[12px] overflow-hidden rounded-[8px] border border-lcars-border bg-lcars-surface p-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <h2 className="text-lcars-primary-ink">Schwerpunkt wählen</h2>
          <button
            type="button"
            onClick={onClose}
            className="lcars-icon-btn"
            aria-label="Schließen"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-[8px]">
          <label className="flex flex-col gap-[4px] flex-1 min-w-[180px]">
            <span className="lcars-eyebrow">Suche</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name oder Text"
              className="lcars-input rounded-full w-full"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-[4px]">
            <span className="lcars-eyebrow">Disziplin</span>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="lcars-input rounded-full"
            >
              <option value="">Alle</option>
              {FOCUS_DISCIPLINES.map((key) => (
                <option key={key} value={key}>
                  {FOCUS_DISCIPLINE_LABELS[key].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-lcars-ink-dim text-[12px]">
          {visible.length} Schwerpunkte
          {!affordable && cost !== null ? ` · ${cost} AP nötig` : ""}
        </p>

        <div className="flex flex-col gap-[4px] overflow-y-auto">
          {visible.length === 0 ? (
            <p className="lcars-empty-state">
              Kein Schwerpunkt passt zur Suche.
            </p>
          ) : (
            visible.map((entry) => (
              <div
                key={entry.name}
                className="flex flex-wrap items-baseline gap-[8px] border-b border-[var(--lcars-ink-dim)]/30 pb-[6px]"
              >
                <span className="flex-1 min-w-[160px]">
                  {entry.name}
                  {entry.descriptions.length > 0 && (
                    <span className="text-lcars-ink-dim block text-[12px]">
                      {entry.descriptions.join(" · ")}
                    </span>
                  )}
                </span>
                <span className="lcars-eyebrow">
                  {entry.disciplines.join(" · ")}
                </span>
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => onPick(entry.name)}
                  className="lcars-pill-btn--outline disabled:opacity-50"
                >
                  {cost === null ? "Übernehmen" : `Übernehmen · ${cost} AP`}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function FocusPicker({
  focuses,
  taken = [],
  cost = null,
  availableAp = null,
  disabled = false,
  buttonLabel = "Schwerpunkt wählen …",
  onPick,
}: {
  focuses: Focus[];
  taken?: string[];
  // Kosten eines Schwerpunkts (Steigern) bzw. null in der Ersterschaffung.
  cost?: number | null;
  // Verfügbare AP; zusammen mit cost sperrt das die Übernahme, wenn sie nicht
  // reichen. null = keine AP-Prüfung.
  availableAp?: number | null;
  disabled?: boolean;
  buttonLabel?: string;
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const affordable =
    cost === null || availableAp === null || availableAp >= cost;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {open && (
        <FocusModal
          focuses={focuses}
          taken={taken}
          cost={cost}
          affordable={affordable}
          onPick={(name) => {
            setOpen(false);
            onPick(name);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

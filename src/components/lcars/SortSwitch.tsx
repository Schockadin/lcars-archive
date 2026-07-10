"use client";
import Switch from "./Switch";
import { SortArrowIcon } from "@/lib/icons";

export type SortDir = "asc" | "desc";

export interface SortSwitchOption<T extends string> {
  key: T;
  label: string;
  // false = reine Auswahl ohne eigene Richtung (z.B. eine Gruppierung wie
  // "Mission"/"Autor", die intern immer fest sortiert ist) — Klick wählt
  // sie nur aus, kein Pfeil, kein Richtungs-Toggle. Default true.
  sortable?: boolean;
}

// Sortier-Variante von Switch: der erste Klick auf eine (noch inaktive)
// Option aktiviert sie immer aufsteigend (Pfeil nach oben); jeder weitere
// Klick auf dieselbe, bereits aktive Option togglet zwischen auf-/
// absteigend. Ersetzt das bisherige Muster aus primärem Sortier-Switch +
// separatem, nur bedingt sichtbarem Auf-/Absteigend-Switch — eine einzelne
// Option pro Sortierbarem Feld statt zwei Optionen ("Neueste zuerst"/
// "Älteste zuerst") pro Feld.
export default function SortSwitch<T extends string>({
  options,
  sortKey,
  sortDir,
  onChange,
  className,
}: {
  options: SortSwitchOption<T>[];
  sortKey: T;
  sortDir: SortDir;
  onChange: (key: T, dir: SortDir) => void;
  className?: string;
}) {
  function handleChange(key: T) {
    const opt = options.find((o) => o.key === key);
    const sortable = opt?.sortable ?? true;
    if (!sortable) {
      onChange(key, sortDir);
      return;
    }
    onChange(key, key === sortKey ? (sortDir === "asc" ? "desc" : "asc") : "asc");
  }

  return (
    <Switch
      className={className}
      active={sortKey}
      onChange={handleChange}
      options={options.map((opt) => {
        const isActive = opt.key === sortKey;
        const sortable = opt.sortable ?? true;
        return {
          key: opt.key,
          label:
            isActive && sortable ? (
              <span className="lcars-sort-switch-label">
                {opt.label}
                <span
                  className="lcars-sort-switch-arrow"
                  style={{
                    display: "inline-flex",
                    transform: sortDir === "desc" ? "rotate(180deg)" : undefined,
                  }}
                >
                  <SortArrowIcon />
                </span>
              </span>
            ) : (
              opt.label
            ),
        };
      })}
    />
  );
}

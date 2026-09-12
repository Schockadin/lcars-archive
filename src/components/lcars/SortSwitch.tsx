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
  // Richtung, mit der diese Option beim Aktivieren startet. Default "asc"
  // (siehe unten). "desc" für Felder, bei denen das Neueste die nützliche
  // Vorgabe ist — etwa das Datum einer Logbuch-Liste.
  defaultDir?: SortDir;
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
    onChange(
      key,
      key === sortKey
        ? sortDir === "asc"
          ? "desc"
          : "asc"
        : (opt?.defaultDir ?? "asc"),
    );
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
          // Der Pfeil bleibt bei jeder sortierbaren Option im Layout — nur
          // sichtbar ist er an der aktiven. Sonst wanderte die Beschriftung
          // beim Umschalten seitlich, weil die inaktive Option plötzlich
          // schmaler wird.
          label: sortable ? (
            <span className="lcars-sort-switch-label">
              {opt.label}
              <span
                className="lcars-sort-switch-arrow"
                aria-hidden={!isActive}
                style={{
                  display: "inline-flex",
                  visibility: isActive ? undefined : "hidden",
                  transform:
                    isActive && sortDir === "desc"
                      ? "rotate(180deg)"
                      : undefined,
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

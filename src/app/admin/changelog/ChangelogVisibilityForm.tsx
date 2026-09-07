"use client";
import { useActionState, useState } from "react";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import {
  saveChangelogVisibilityAction,
  type ChangelogVisibilityState,
} from "./actions";

const initialState: ChangelogVisibilityState = {};

export interface ChangelogVersionOption {
  version: string;
  title: string;
  itemCount: number;
}

// Auswahl der auf dem Dashboard sichtbaren Changelog-Versionen: je Version eine
// Checkbox. Gespeichert wird die Menge der angehakten Versionen (name="versions"
// → FormData.getAll in der Server-Action). „Alle/Keine" schaltet komfortabel um.
export default function ChangelogVisibilityForm({
  options,
  selectedVersions,
}: {
  options: ChangelogVersionOption[];
  selectedVersions: string[];
}) {
  const [state, formAction, pending] = useActionState(
    saveChangelogVisibilityAction,
    initialState,
  );

  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(selectedVersions),
  );

  function toggle(version: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  }

  function selectAll() {
    setChecked(new Set(options.map((o) => o.version)));
  }

  function selectNone() {
    setChecked(new Set());
  }

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      {/* Auf schmalen Screens untereinander statt nebeneinander: Zähler und
          die Alle/Keine-Knöpfe drängeln sich sonst in einer Zeile. */}
      <div className="flex items-center justify-between gap-[12px] max-sm:flex-col max-sm:items-start">
        <p className="text-lcars-ink-dim text-[13px]">
          {checked.size} von {options.length} Versionen ausgewählt.
        </p>
        {/* flex-wrap + volle Breite auf Mobile: .lcars-pill-btn--outline hat
            min-width 180px und unter 480px width:100% (controls.css) — zwei
            davon passen dort nicht nebeneinander und liefen sonst rechts aus
            dem Bild. */}
        <div className="flex flex-wrap gap-[8px] max-sm:w-full">
          <button
            type="button"
            onClick={selectAll}
            className="lcars-pill-btn--outline text-[12px] px-[12px] py-[4px]"
          >
            Alle
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="lcars-pill-btn--outline text-[12px] px-[12px] py-[4px]"
          >
            Keine
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-[8px]">
        {options.map((option) => {
          const isChecked = checked.has(option.version);
          return (
            <label
              key={option.version}
              className={`flex items-start gap-[12px] rounded-[var(--lcars-radius-pill)] border px-[16px] py-[10px] cursor-pointer transition-colors ${
                isChecked
                  ? "border-lcars-primary bg-lcars-surface-2"
                  : "border-lcars-border bg-lcars-surface"
              }`}
            >
              <input
                type="checkbox"
                name="versions"
                value={option.version}
                checked={isChecked}
                onChange={() => toggle(option.version)}
                className="mt-[3px] accent-[var(--lcars-primary)]"
              />
              <span className="flex flex-col">
                <span className="lcars-eyebrow text-lcars-ink-light">
                  Version {option.version}
                </span>
                <span className="text-[13px]">{option.title}</span>
                <span className="text-lcars-ink-dim text-[12px]">
                  {option.itemCount}{" "}
                  {option.itemCount === 1 ? "Neuerung" : "Neuerungen"}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

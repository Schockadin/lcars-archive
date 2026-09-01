"use client";
import { useId } from "react";
import {
  TALENT_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  talentOptionLabel,
  type Talent,
} from "@/lib/talentCatalog";

// Auswahlliste aus dem Talent-Katalog (Tabelle talents, gepflegt unter
// /gm/talents). Genutzt vom Steigern-Panel und vom Werte-Formular des
// Charakterbogens — deshalb eine gemeinsame Komponente statt zweier Selects.
//
// Der ausgewählte Wert ist der reine Talentname: genau der landet auf dem
// Charakterbogen (characters.metadata.stats.talents). Die leere Auswahl gibt
// "" zurück, damit sich der aufrufende Code den Freitext-Fall selbst bauen
// kann (siehe AdvancementPanel).
export default function TalentPicker({
  talents,
  value,
  onChange,
  disabled = false,
  label = "Talent",
  // Namen, die schon auf dem Bogen stehen — sie werden ausgegraut, damit
  // niemand versehentlich ein zweites Mal dasselbe Talent nimmt.
  taken = [],
}: {
  talents: Talent[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  label?: string;
  taken?: string[];
}) {
  const selectId = useId();
  const takenSet = new Set(taken.map((name) => name.toLowerCase()));
  const selected = talents.find((talent) => talent.name === value);

  return (
    <div className="flex flex-col gap-[4px]">
      <label htmlFor={selectId} className="stat-label-secondary">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="stat-field-input"
      >
        <option value="">— bitte wählen —</option>
        {TALENT_CATEGORIES.map((category) => {
          const inCategory = talents.filter((t) => t.category === category);
          if (inCategory.length === 0) return null;
          return (
            <optgroup
              key={category}
              label={TALENT_CATEGORY_LABELS[category].label}
            >
              {inCategory.map((talent) => (
                <option
                  key={talent.id}
                  value={talent.name}
                  disabled={takenSet.has(talent.name.toLowerCase())}
                >
                  {talentOptionLabel(talent)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {selected && (
        <p className="stat-talent-description">
          {selected.requirement && (
            <span className="stat-label-secondary">
              Voraussetzung: {selected.requirement}
              {" · "}
            </span>
          )}
          {selected.description}
        </p>
      )}
    </div>
  );
}

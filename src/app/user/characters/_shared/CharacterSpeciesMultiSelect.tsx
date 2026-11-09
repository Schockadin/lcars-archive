"use client";

import { useState } from "react";
import { MinusCircleIcon } from "@/lib/icons";
import { findSpeciesOption, SPECIES_OPTIONS } from "@/lib/sta2eCharacterOptions";

export default function CharacterSpeciesMultiSelect({
  value,
  onChange,
  idPrefix,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  idPrefix: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canonicalValue = value.map((name) => findSpeciesOption(name)?.name ?? name);
  const unknown = value.filter((name) => !findSpeciesOption(name));
  const selectedLabels = value.map((name) =>
    findSpeciesOption(name)?.label ?? name,
  );

  function toggleSpecies(name: string, checked: boolean) {
    onChange(
      checked
        ? [...canonicalValue.filter((entry) => entry !== name), name]
        : canonicalValue.filter((entry) => entry !== name),
    );
  }

  return (
    <div className="stat-editor-field character-species-picker">
      <span className="stat-field-label" id={`${idPrefix}-species-label`}>
        <span className="stat-label-primary">Species</span>
        <span className="stat-label-secondary">Spezies</span>
      </span>
      <details
        className="character-species-picker-dropdown"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary
          className="stat-field-input character-species-picker-summary"
          aria-labelledby={`${idPrefix}-species-label`}
        >
          {selectedLabels.length ? selectedLabels.join(", ") : "Spezies auswählen …"}
        </summary>
        <fieldset disabled={disabled} className="character-species-picker-options">
          <legend className="lcars-eyebrow">Verfügbare Spezies</legend>
          {SPECIES_OPTIONS.map((species) => (
            <label key={species.id} className="character-species-picker-option">
              <input
                type="checkbox"
                name="species"
                value={species.name}
                checked={canonicalValue.includes(species.name)}
                onChange={(event) => toggleSpecies(species.name, event.target.checked)}
              />
              <span>{species.label}</span>
            </label>
          ))}
        </fieldset>
      </details>
      {disabled && canonicalValue.filter((name) => findSpeciesOption(name)).map((name) => <input key={name} type="hidden" name="species" value={name} />)}
      {unknown.map((name) => (
        <div className="character-species-picker-legacy" key={name}>
          <input type="hidden" name="species" value={name} />
          <span>{name} (eigene Spezies)</span>
          <button
            type="button"
            disabled={disabled}
            className="lcars-icon-btn"
            aria-label={`${name} entfernen`}
            title={`${name} entfernen`}
            onClick={() => toggleSpecies(name, false)}
          >
            <MinusCircleIcon />
          </button>
        </div>
      ))}
      <span className="lcars-text text-[13px]">
        Mehrere Spezies sind möglich. Verfügbare Species Abilities erscheinen im Tab „Werte“.
      </span>
    </div>
  );
}

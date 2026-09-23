"use client";

export interface ChoiceCardOption<Id extends string> {
  id: Id;
  label: string;
  description: string;
}

// Gemeinsame Radio-Karten für Darstellungsoptionen. Die drei Profilformulare
// unterschieden sich bisher nur in Daten und optionaler Vorschau, hielten aber
// Fokus-, Auswahl- und Styling-Markup jeweils als eigene Kopie vor.
export default function ChoiceCardGroup<Id extends string>({
  name,
  ariaLabel,
  legend,
  hint,
  options,
  selected,
  onSelect,
  renderPreview,
}: {
  name: string;
  ariaLabel?: string;
  legend?: string;
  hint?: string;
  options: readonly ChoiceCardOption<Id>[];
  selected: Id;
  onSelect: (id: Id) => void;
  renderPreview?: (option: ChoiceCardOption<Id>) => React.ReactNode;
}) {
  const cards = options.map((option) => {
    const isSelected = selected === option.id;
    return (
      <label
        key={option.id}
        className={`relative flex items-center gap-[12px] rounded-[var(--lcars-radius-pill)] border px-[16px] py-[10px] cursor-pointer transition-colors ${
          isSelected
            ? "border-lcars-primary bg-lcars-surface-2"
            : "border-lcars-border bg-lcars-surface"
        }`}
      >
        <input
          type="radio"
          name={name}
          value={option.id}
          checked={isSelected}
          onChange={() => onSelect(option.id)}
          className="sr-only"
        />
        <span className="flex flex-col gap-[2px] min-w-0">
          <span
            className={`lcars-eyebrow ${
              isSelected ? "text-lcars-primary-ink" : "text-lcars-ink-light"
            }`}
          >
            {option.label}
          </span>
          <span className="text-lcars-ink-dim text-[12px]">
            {option.description}
          </span>
          {renderPreview?.(option)}
        </span>
      </label>
    );
  });

  if (legend) {
    return (
      <fieldset className="flex flex-col gap-[8px]">
        <legend className="lcars-eyebrow">{legend}</legend>
        {hint && <p className="text-lcars-ink-dim text-[12px]">{hint}</p>}
        {cards}
      </fieldset>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-col gap-[8px]"
    >
      {cards}
    </div>
  );
}

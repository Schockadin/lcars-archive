"use client";

// Kleines, wiederverwendbares Freitext-Filterfeld für die Übersichtsseiten
// (/characters, /archive, /missions) — neben den Sortier-Optionen platziert,
// grenzt die sichtbare Liste client-seitig ein. Bewusst rein präsentational
// (kontrolliert über value/onChange), die Filterlogik lebt in der jeweiligen
// Listen-Komponente.
export default function ListFilterInput({
  value,
  onChange,
  ariaLabel,
  placeholder = "Filtern…",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`lcars-list-filter lcars-input rounded-full ${className}`}
    />
  );
}

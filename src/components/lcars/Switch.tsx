export interface SwitchOption<T extends string> {
  key: T;
  label: React.ReactNode;
}

// Generischer LCARS-Pill-Umschalter für exklusive Optionen (Sortierung,
// Filter, Ansicht). Layout/Abstand kommt per className vom Aufrufer, da
// Toolbars unterschiedliche Container-Klassen mitbringen (.mission-sort,
// .search-type-filter, …) statt hier ein Layout zu erzwingen.
export default function Switch<T extends string>({
  options,
  active,
  onChange,
  className,
  itemClassName = "lcars-switch flex-1",
}: {
  options: SwitchOption<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={className}>
      {options.map((opt) => {
        const isActive = active === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={itemClassName}
            style={{
              backgroundColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-surface)",
              color: isActive ? "var(--lcars-bg)" : "var(--lcars-text-data)",
              borderColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-text-data)",
            }}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}

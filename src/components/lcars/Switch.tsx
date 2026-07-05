export interface SwitchOption<T extends string> {
  key: T;
  label: React.ReactNode;
  disabled?: boolean;
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
            onClick={opt.disabled ? undefined : () => onChange(opt.key)}
            className={itemClassName}
            aria-disabled={opt.disabled || undefined}
            style={{
              backgroundColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-surface)",
              color: isActive ? "var(--lcars-bg)" : "var(--lcars-text-data)",
              borderColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-text-data)",
              opacity: opt.disabled ? 0.4 : 1,
              cursor: opt.disabled ? "not-allowed" : "pointer",
            }}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}

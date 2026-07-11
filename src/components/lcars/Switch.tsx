"use client";

export interface SwitchOption<T extends string> {
  key: T;
  label: React.ReactNode;
  disabled?: boolean;
}

// Generischer LCARS-Umschalter für exklusive Optionen (Sortierung, Filter,
// Ansicht) — die aktive Option bekommt direkt text-lcars-bg/bg-lcars-text-data,
// kein gemeinsamer gleitender Balken mehr (siehe git-history für die vorherige,
// per getBoundingClientRect() gemessene Variante).
export default function Switch<T extends string>({
  options,
  active,
  onChange,
  className,
  itemClassName = "lcars-switch-item flex-1",
}: {
  options: SwitchOption<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={`lcars-switch-group ${className ?? ""}`}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={opt.disabled}
          aria-pressed={active === opt.key}
          onClick={opt.disabled ? undefined : () => onChange(opt.key)}
          className={`${itemClassName}${active === opt.key ? " text-lcars-bg bg-lcars-text-data" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

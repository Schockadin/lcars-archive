"use client";
import { FormError } from "@/app/_shared/FormPrimitives";

// Gemeinsames Label+Select+Error-Wrapper-Markup hinter OwnerSelect.tsx und
// AdminVisibilitySelect.tsx — beide binden sich an useOptimisticAdminSelect
// und unterscheiden sich nur in Label-Text und Optionsliste. Rein
// string-basiert (Select-Werte sind immer Strings) — die Umwandlung
// zu/von domänenspezifischen Typen (Visibility, number | null) bleibt beim
// jeweiligen Aufrufer.
export default function AdminSelectField({
  label,
  value,
  onChange,
  disabled,
  options,
  ariaLabel,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  options: { value: string; label: string }[];
  ariaLabel: string;
  error?: string | null;
}) {
  return (
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className="lcars-eyebrow">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="lcars-input rounded-full"
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FormError message={error ?? undefined} className="text-[12px]" />
    </div>
  );
}

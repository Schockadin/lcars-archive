"use client";
import { useState, useTransition } from "react";
import { setVisibilityAction, type VisibilityContentType } from "./actions";
import type { Visibility } from "@/lib/visibility";

// Eigene Label-Liste statt VISIBILITY_LABELS aus @/lib/visibility zu
// importieren — jenes Modul ist "server-only" und darf aus einer Client
// Component nicht als Wert (nur als Typ) importiert werden.
const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "private", label: "Privat" },
  { value: "gm", label: "GM" },
  { value: "public", label: "Öffentlich" },
];

export default function VisibilitySelect({
  contentType,
  id,
  initialValue,
}: {
  contentType: VisibilityContentType;
  id: number;
  initialValue: Visibility;
}) {
  const [value, setValue] = useState<Visibility>(initialValue);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Visibility;
        setValue(next);
        startTransition(async () => {
          await setVisibilityAction(contentType, id, next);
        });
      }}
      className="lcars-input"
      aria-label="Sichtbarkeit"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Geteilte, React-freie Helfer für die Timeline-Seite.

// Kategorie ist freier Text (siehe scripts/ingest/timeline.ts) — bekannte
// Werte bekommen eine feste Farbe, alles andere fällt auf DEFAULT_CATEGORY
// zurück. Neue Kategorien im Vault brauchen also keine Code-Änderung, nur
// ggf. einen Eintrag hier für eine eigene Farbe.
export const TIMELINE_CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  mission: { label: "Mission", color: "var(--lcars-blue)" },
  log: { label: "Logbuch", color: "var(--lcars-amber-light)" },
  archiv: { label: "Archiv", color: "var(--lcars-purple)" },
  geburt: { label: "Geburt", color: "var(--lcars-green)" },
  tod: { label: "Tod", color: "var(--lcars-red)" },
  schlacht: { label: "Schlacht", color: "var(--lcars-red)" },
  diplomatie: { label: "Diplomatie", color: "var(--lcars-orange)" },
  entdeckung: { label: "Entdeckung", color: "var(--lcars-blue)" },
  sonstiges: { label: "Sonstiges", color: "var(--lcars-text-data)" },
};

export const DEFAULT_TIMELINE_CATEGORY = "sonstiges";

export function timelineCategoryConfig(category: string): {
  label: string;
  color: string;
} {
  return (
    TIMELINE_CATEGORY_CONFIG[category] ?? {
      label: category,
      color: TIMELINE_CATEGORY_CONFIG[DEFAULT_TIMELINE_CATEGORY].color,
    }
  );
}

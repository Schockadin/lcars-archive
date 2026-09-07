// Die Kategorien, in die ein Changelog-Stichpunkt fällt.
//
// Sie sind Metadaten an den Einträgen (src/lib/changelog.ts) und dienen an
// beiden Anzeigestellen zum Filtern und Sortieren: der öffentlichen Liste
// unter /changelog und der Box „Neue Funktionen" auf dem Dashboard. Zusätzlich
// entscheidet die Administration je Rolle, welche Kategorien in dieser Box
// nicht erscheinen (siehe changelogSettings.ts).
//
// Bewusst eine überschaubare, feste Liste statt frei vergebbarer Schlagwörter:
// die Einträge sind code-gepflegt (siehe AGENTS.md), und eine Auswahl, die
// jede Version anders benennt, taugt weder zum Filtern noch zum Ausblenden.
//
// Kein "server-only": beide Renderer und das Admin-Formular sind
// Client-Komponenten.

export const CHANGELOG_CATEGORIES = [
  {
    id: "inhalte",
    label: "Inhalte & Archiv",
    // Farbe des Etiketts — dieselben LCARS-Akzente wie die Chronologie.
    color: "var(--lcars-secondary)",
  },
  { id: "charaktere", label: "Charaktere & Regeln", color: "var(--lcars-tertiary)" },
  { id: "spielleitung", label: "Spielleitung", color: "var(--lcars-quaternary)" },
  { id: "darstellung", label: "Darstellung", color: "var(--lcars-primary)" },
  {
    id: "benachrichtigungen",
    label: "Benachrichtigungen",
    color: "var(--lcars-senary)",
  },
  { id: "konto", label: "Konto & Sicherheit", color: "var(--lcars-quinary)" },
  { id: "export", label: "Export & Druck", color: "var(--lcars-primary-light)" },
  // Auffangkategorie für Stichpunkte ohne eigene Angabe. Steht bewusst in der
  // Liste, damit auch sie filter- und ausblendbar sind.
  { id: "sonstiges", label: "Sonstiges", color: "var(--lcars-border)" },
] as const;

export type ChangelogCategoryId = (typeof CHANGELOG_CATEGORIES)[number]["id"];

export const FALLBACK_CATEGORY: ChangelogCategoryId = "sonstiges";

const BY_ID = new Map(CHANGELOG_CATEGORIES.map((c) => [c.id as string, c]));

export function isChangelogCategory(
  value: unknown,
): value is ChangelogCategoryId {
  return typeof value === "string" && BY_ID.has(value);
}

export function changelogCategoryLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

export function changelogCategoryColor(id: string): string {
  return BY_ID.get(id)?.color ?? "var(--lcars-border)";
}

// Die Reihenfolge der Kategorien in dieser Datei ist auch die Sortierung —
// alphabetisch nach Label wären „Charaktere" und „Konto" auseinandergerissen,
// obwohl die Liste hier bewusst vom Häufigsten zum Selteneren läuft.
export function changelogCategoryRank(id: string): number {
  const index = CHANGELOG_CATEGORIES.findIndex((c) => c.id === id);
  return index === -1 ? CHANGELOG_CATEGORIES.length : index;
}

// Welche Kategorien für jemanden mit DIESEN Rollen ausgeblendet sind.
//
// Eine Person kann mehrere Rollen haben (role + additional_roles). Verborgen
// bleibt eine Kategorie nur, wenn ALLE ihre Rollen sie verbergen — wer neben
// „Spieler" auch „Spielleitung" ist, soll die Spielleitungs-Neuerungen sehen.
// Sichtbarkeit gewinnt also, wie überall sonst bei mehreren Rollen (siehe
// resolvePermissions in permissions.ts).
export function hiddenCategoriesForRoles(
  hiddenByRole: Record<string, readonly string[]>,
  roles: readonly string[],
): ChangelogCategoryId[] {
  if (roles.length === 0) return [];
  const sets = roles.map((role) => new Set(hiddenByRole[role] ?? []));
  return CHANGELOG_CATEGORIES.map((c) => c.id).filter((id) =>
    sets.every((set) => set.has(id)),
  ) as ChangelogCategoryId[];
}

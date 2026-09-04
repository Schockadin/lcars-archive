// Gemeinsame Quelle der Wahrheit für die Abschnitte der Anleitung (/tutorial):
// Jeder Abschnitt hat eine stabile Anker-id (für Deep-Links per URL-Hash) und
// seine Überschrift. Genutzt von src/app/tutorial/page.tsx (setzt id + Titel je
// LcarsDataRow-Abschnitt) UND von src/lib/changelog.ts, dessen Einträge über
// diese ids auf den passenden Anleitungsabschnitt verlinken. Beide Seiten
// müssen dieselben ids verwenden — deshalb liegen sie hier zentral, React- und
// DB-frei (wie campaignFormat.ts / permissions.ts), damit sie überall
// importierbar und unit-testbar sind.
export const TUTORIAL_SECTIONS = [
  { id: "fuer-besucher", label: "Für Besucher" },
  { id: "konto-rollen", label: "Konto & Rollen" },
  { id: "eigene-inhalte", label: "Eigene Inhalte" },
  { id: "gespraeche", label: "Gespräche" },
  { id: "merken-abonnieren", label: "Merken & Abonnieren" },
  { id: "datenbank-assistent", label: "Datenbank-Assistent" },
  { id: "markdown", label: "Markdown" },
  { id: "verlinkung", label: "Verlinkung" },
  { id: "spielleitung-admins", label: "Spielleitung & Admins" },
  { id: "app-installieren", label: "App installieren" },
  { id: "farbschema", label: "Farbschema" },
] as const;

export type TutorialSectionId = (typeof TUTORIAL_SECTIONS)[number]["id"];

const LABEL_BY_ID: Record<TutorialSectionId, string> = Object.fromEntries(
  TUTORIAL_SECTIONS.map((s) => [s.id, s.label]),
) as Record<TutorialSectionId, string>;

// Überschrift eines Abschnitts (für die Beschriftung des Tutorial-Links im
// Changelog, z.B. „Eigene Inhalte").
export function tutorialSectionLabel(id: TutorialSectionId): string {
  return LABEL_BY_ID[id];
}

// Deep-Link auf einen Abschnitt der Anleitung. Der Hash entspricht der id des
// Abschnitts-Wrappers in tutorial/page.tsx; DataRowAccordion klappt den
// passenden Abschnitt beim Laden mit diesem Hash automatisch auf.
export function tutorialSectionHref(id: TutorialSectionId): string {
  return `/tutorial#${id}`;
}

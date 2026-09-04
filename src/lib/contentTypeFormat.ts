// Gemeinsame Darstellung der vier Inhaltstypen (Charakter, Mission,
// Mission-Log, Datenbank-Eintrag) plus Gespräch — React-/DB-frei, damit sie in
// Server-, Client-Komponenten UND Tests nutzbar ist (gleiches Muster wie
// archiveFormat.ts / missionFormat.ts).
//
// Hintergrund: Farben und Beschriftungen der Inhaltstypen lagen vorher mehrfach
// nebeneinander (Admin-Inhaltsübersicht, „Meine Inhalte", Papierkorb, Bilder,
// Audit-Log, Import) und wichen dabei voneinander ab — derselbe Typ hatte je
// nach Seite eine andere Farbe bzw. Schreibweise. Diese Datei ist die EINE
// Quelle dafür.

// Die vier Typen mit eigenem Datensatz und Owner. Sie sind die kanonische
// Union hinter OwnerContentType (app/actions/owner.ts) und TimelineSourceType
// (types/timeline.ts) — vorher stand dieselbe Aufzählung dreimal im Code.
export const OWNER_CONTENT_TYPES = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
] as const;

export type OwnerContentTypeKey = (typeof OWNER_CONTENT_TYPES)[number];

// "dialogue" ist kein Owner-Inhaltstyp (Gespräche liegen als archive_entry der
// Kategorie "dialogue"), wird aber in Papierkorb/„Meine Inhalte" getrennt
// ausgewiesen und braucht darum eine eigene Farbe/Beschriftung.
export type ContentTypeKey = OwnerContentTypeKey | "dialogue";

// Farbe der DataRow-Pille je Inhaltstyp. Bewusst NUR für Inhaltstypen —
// dekorative Farbrotationen (z.B. je Autor oder je Version) gibt es nicht mehr,
// die betreffenden DataRows nutzen die Default-Farbe der Komponente. So trägt
// eine farbige Pille immer dieselbe Bedeutung, statt bloß Abwechslung zu sein.
// Die Gesprächsfarbe stimmt mit CATEGORY_CONFIG.dialogue.color
// (archiveFormat.ts) überein, weil Gespräche dort dieselbe Kategorie sind.
export const CONTENT_TYPE_COLOR: Record<ContentTypeKey, string> = {
  character: "var(--lcars-primary)",
  mission: "var(--lcars-senary)",
  mission_log: "var(--lcars-tertiary)",
  archive_entry: "var(--lcars-secondary)",
  dialogue: "var(--lcars-ink-data)",
};

// Zustandsfarbe für „Entwurf" — quer über ALLE Inhaltstypen (die Entwurfs-
// Sektion in „Meine Inhalte" mischt Charaktere, Logs, Gespräche und
// Datenbank-Einträge). Deshalb keine Typ-, sondern eine Zustandsfarbe:
// Abschnittszeile und die Karten darin tragen sie gemeinsam.
export const CONTENT_DRAFT_COLOR = "var(--lcars-quinary)";

// Einzahl — für Zeilen, die genau einen Inhalt beschreiben (Papierkorb,
// Bilderliste, Audit-Log, Import-Vorschau).
export const CONTENT_TYPE_LABEL: Record<ContentTypeKey, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Missionslog",
  archive_entry: "Datenbank-Eintrag",
  dialogue: "Gespräch",
};

// Mehrzahl — für Gruppen-/Abschnittsüberschriften und Filter.
export const CONTENT_TYPE_LABEL_PLURAL: Record<ContentTypeKey, string> = {
  character: "Charaktere",
  mission: "Missionen",
  mission_log: "Missionslogs",
  archive_entry: "Datenbank-Einträge",
  dialogue: "Gespräche",
};

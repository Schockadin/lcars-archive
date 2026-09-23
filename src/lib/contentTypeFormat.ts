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

// Eine Registry statt paralleler Listen: neue Inhaltstypen erhalten damit an
// genau einer Stelle Beschriftung, Farbe und Fähigkeiten. Das Objekt bleibt
// React-/DB-frei und darf deshalb auch in Client Components importiert werden.
export const CONTENT_TYPES = {
  character: {
    label: "Charakter",
    pluralLabel: "Charaktere",
    color: "var(--lcars-primary)",
    hasOwner: true,
  },
  mission: {
    label: "Mission",
    pluralLabel: "Missionen",
    color: "var(--lcars-senary)",
    hasOwner: true,
  },
  mission_log: {
    label: "Missionslog",
    pluralLabel: "Missionslogs",
    color: "var(--lcars-tertiary)",
    hasOwner: true,
  },
  archive_entry: {
    label: "Datenbank-Eintrag",
    pluralLabel: "Datenbank-Einträge",
    color: "var(--lcars-secondary)",
    hasOwner: true,
  },
  // Gespräche liegen technisch als archive_entry vor, werden in Ansichten
  // und im Papierkorb aber als eigener Typ geführt.
  dialogue: {
    label: "Gespräch",
    pluralLabel: "Gespräche",
    color: "var(--lcars-ink-data)",
    hasOwner: false,
  },
} as const;

export type ContentTypeKey = keyof typeof CONTENT_TYPES;
export type OwnerContentTypeKey = {
  [Key in ContentTypeKey]: (typeof CONTENT_TYPES)[Key]["hasOwner"] extends true
    ? Key
    : never;
}[ContentTypeKey];

export const OWNER_CONTENT_TYPES = Object.keys(CONTENT_TYPES).filter(
  (key): key is OwnerContentTypeKey =>
    CONTENT_TYPES[key as ContentTypeKey].hasOwner,
);

// Farbe der DataRow-Pille je Inhaltstyp. Bewusst NUR für Inhaltstypen —
// dekorative Farbrotationen (z.B. je Autor oder je Version) gibt es nicht mehr,
// die betreffenden DataRows nutzen die Default-Farbe der Komponente. So trägt
// eine farbige Pille immer dieselbe Bedeutung, statt bloß Abwechslung zu sein.
// Die Gesprächsfarbe stimmt mit CATEGORY_CONFIG.dialogue.color
// (archiveFormat.ts) überein, weil Gespräche dort dieselbe Kategorie sind.
export const CONTENT_TYPE_COLOR = Object.fromEntries(
  Object.entries(CONTENT_TYPES).map(([key, value]) => [key, value.color]),
) as Record<ContentTypeKey, string>;

// Zustandsfarbe für „Entwurf" — quer über ALLE Inhaltstypen (die Entwurfs-
// Sektion in „Meine Inhalte" mischt Charaktere, Logs, Gespräche und
// Datenbank-Einträge). Deshalb keine Typ-, sondern eine Zustandsfarbe:
// Abschnittszeile und die Karten darin tragen sie gemeinsam.
export const CONTENT_DRAFT_COLOR = "var(--lcars-quinary)";

// Einzahl — für Zeilen, die genau einen Inhalt beschreiben (Papierkorb,
// Bilderliste, Audit-Log, Import-Vorschau).
export const CONTENT_TYPE_LABEL = Object.fromEntries(
  Object.entries(CONTENT_TYPES).map(([key, value]) => [key, value.label]),
) as Record<ContentTypeKey, string>;

// Mehrzahl — für Gruppen-/Abschnittsüberschriften und Filter.
export const CONTENT_TYPE_LABEL_PLURAL = Object.fromEntries(
  Object.entries(CONTENT_TYPES).map(([key, value]) => [key, value.pluralLabel]),
) as Record<ContentTypeKey, string>;

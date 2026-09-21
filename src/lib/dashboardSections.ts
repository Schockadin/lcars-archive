// Was auf dem Dashboard ("/" für eingeloggte User, siehe src/app/Dashboard.tsx)
// erscheint — und was nicht. Jede Sektion ist hier einmal beschrieben: ihr
// Schlüssel, ihre Beschriftung im Profil und ihre Vorgabe.
//
// Reine Funktionen ohne DB-Zugriff, damit sich die Auflösung ohne Postgres
// prüfen lässt (siehe dashboardSections.test.ts). Gelesen und geschrieben
// wird die Spalte users.dashboard_prefs (JSONB) — siehe src/lib/users.ts.
//
// Gespeichert werden NUR Abweichungen von der Vorgabe, nicht der vollständige
// Stand. Das hat zwei Gründe: Eine neue Sektion bekommt so automatisch ihre
// Code-Vorgabe, ohne dass jedes bestehende Konto angefasst werden müsste; und
// eine Vorgabe lässt sich später ändern, ohne dass alle, die sie nie berührt
// haben, auf dem alten Wert festhängen.

export const DASHBOARD_SECTIONS = [
  {
    id: "erste-schritte",
    label: "Erste Schritte",
    hint: "Die Einstiegs-Checkliste. Sie verschwindet ohnehin, sobald alles erledigt ist.",
    default: false,
  },
  {
    id: "spielabende",
    label: "Nächste Spielabende",
    hint: "Die angesetzten Termine samt Zu-/Absage.",
    default: true,
  },
  {
    id: "todos",
    label: "To Dos",
    hint: "Was von dir noch aussteht — offene Entwürfe, unbeantwortete Gespräche.",
    default: false,
  },
  {
    id: "gespraeche",
    label: "Offene Gespräche",
    hint: "Laufende Gespräche deiner Charaktere.",
    default: true,
  },
  {
    id: "neues-log",
    label: "Neues Log",
    hint: "Knopf, der das Formular für einen neuen Missionslog öffnet.",
    default: true,
  },
  {
    id: "neues-gespraech",
    label: "Neues Gespräch",
    hint: "Knopf, der das Formular für ein neues Gespräch öffnet.",
    default: true,
  },
  {
    id: "neuer-eintrag",
    label: "Neuer Datenbank-Eintrag",
    hint: "Knopf, der das Formular für einen neuen Datenbank-Eintrag öffnet.",
    default: true,
  },
  {
    id: "neuer-npc",
    label: "Neuer NPC",
    hint: "Knopf für einen neuen Datenbank-Eintrag mit vorgewählter Kategorie „NPC“.",
    default: true,
  },
  {
    id: "import",
    label: "Import",
    hint: "Knopf zum Markdown-Import. Erscheint nur für die Administration — nur sie darf importieren.",
    default: true,
  },
  {
    id: "entwuerfe",
    label: "Entwürfe",
    hint: "Deine unfertigen Inhalte mit dem Weg zurück in den Editor.",
    default: true,
  },
  {
    id: "charaktere",
    label: "Meine Charaktere",
    hint: "Deine Charaktere mit Bearbeiten-Knopf. Welche davon erscheinen, wählst du darunter einzeln.",
    default: true,
  },
  {
    id: "versionen",
    label: "Versionen",
    hint: "Was sich zuletzt an der Datenbank selbst geändert hat.",
    default: false,
  },
  {
    id: "news",
    label: "News",
    hint: "Neue, geänderte und gelöschte Inhalte der anderen.",
    default: true,
  },
  {
    id: "lesezeichen",
    label: "Lesezeichen",
    hint: "Die Inhalte, die du dir über den Lesezeichen-Knopf gemerkt hast.",
    default: false,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  hint: string;
  default: boolean;
}[];

export type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]["id"];

const SECTION_IDS = new Set<string>(DASHBOARD_SECTIONS.map((s) => s.id));

export function isDashboardSectionId(
  value: string,
): value is DashboardSectionId {
  return SECTION_IDS.has(value);
}

export interface DashboardPrefs {
  // Nur die vom User bewusst gesetzten Werte. Was hier fehlt, gilt mit seiner
  // Vorgabe aus DASHBOARD_SECTIONS.
  sections: Partial<Record<DashboardSectionId, boolean>>;
  // Charaktere, die der User vom Dashboard AUSgeschlossen hat. Andersherum
  // (Liste der gezeigten) müsste jeder neu angelegte Charakter erst
  // freigeschaltet werden — er soll aber, wie die Sektion selbst, per Vorgabe
  // erscheinen.
  hiddenCharacters: number[];
}

export const EMPTY_DASHBOARD_PREFS: DashboardPrefs = {
  sections: {},
  hiddenCharacters: [],
};

// Aus rohem JSONB (Datenbank oder Backup-Datei) eine verlässliche Struktur
// machen: unbekannte Schlüssel, falsche Typen und Unsinn in der
// Charakter-Liste fallen weg, statt später an einer Stelle zu überraschen, die
// mit ihnen nicht rechnet. Gleiche Haltung wie sanitizeThemeOverrides in
// src/lib/themes.ts.
export function sanitizeDashboardPrefs(raw: unknown): DashboardPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return EMPTY_DASHBOARD_PREFS;
  }

  const source = raw as Record<string, unknown>;
  const sections: Partial<Record<DashboardSectionId, boolean>> = {};
  const rawSections = source.sections;

  if (rawSections && typeof rawSections === "object" && !Array.isArray(rawSections)) {
    for (const [key, value] of Object.entries(
      rawSections as Record<string, unknown>,
    )) {
      if (typeof value === "boolean" && isDashboardSectionId(key)) {
        sections[key] = value;
      }
    }
  }

  const hiddenCharacters = Array.isArray(source.hiddenCharacters)
    ? [
        ...new Set(
          source.hiddenCharacters.filter(
            (id): id is number => Number.isInteger(id) && (id as number) > 0,
          ),
        ),
      ]
    : [];

  return { sections, hiddenCharacters };
}

// Zeigt das Dashboard diese Sektion? Die gespeicherte Wahl schlägt die
// Vorgabe, sonst gilt die Vorgabe.
export function dashboardSectionEnabled(
  prefs: DashboardPrefs,
  id: DashboardSectionId,
): boolean {
  const chosen = prefs.sections[id];
  if (typeof chosen === "boolean") return chosen;
  return DASHBOARD_SECTIONS.find((s) => s.id === id)!.default;
}

// Erscheint dieser Charakter in der Charakter-Sektion? Unabhängig davon, ob
// die Sektion selbst an ist — das fragt der Aufrufer zuerst.
export function dashboardCharacterVisible(
  prefs: DashboardPrefs,
  characterId: number,
): boolean {
  return !prefs.hiddenCharacters.includes(characterId);
}

// Aus dem abgeschickten Formular wieder Vorlieben machen: Für jede Sektion
// steht fest, ob sie angehakt war (das Formular schickt zu jeder ein
// verstecktes Feld mit, sonst wäre „alles abgewählt" nicht von „Formular
// kennt die Sektion nicht" zu unterscheiden). Gespeichert wird nur, was von
// der Vorgabe abweicht — siehe den Kopf dieser Datei.
export function buildDashboardPrefs(input: {
  enabledSections: readonly string[];
  knownSections: readonly string[];
  hiddenCharacters: readonly number[];
}): DashboardPrefs {
  const enabled = new Set(input.enabledSections);
  const sections: Partial<Record<DashboardSectionId, boolean>> = {};

  for (const key of input.knownSections) {
    if (!isDashboardSectionId(key)) continue;
    const value = enabled.has(key);
    const fallback = DASHBOARD_SECTIONS.find((s) => s.id === key)!.default;
    if (value !== fallback) sections[key] = value;
  }

  return {
    sections,
    hiddenCharacters: [
      ...new Set(
        input.hiddenCharacters.filter((id) => Number.isInteger(id) && id > 0),
      ),
    ],
  };
}

import type { NewContentData } from "./newContentData";

// Welche Anlege-Knöpfe es gibt und welche davon dastehen — gebraucht an zwei
// Stellen: von der Knopfleiste selbst (NewContentButtons, Client) und von dem
// Abschnitt drumherum (NewContentPanel, Server), der daraus seine Kurzinfo
// bildet und entscheidet, ob er überhaupt erscheint.
//
// Deshalb ein eigenes Modul ohne "use client" und ohne "server-only": Eine
// Funktion aus einer Client-Datei lässt sich auf dem Server nicht aufrufen
// (sie wäre nur eine Referenz), und eine aus einer server-only-Datei nicht im
// Browser. Läge die Zählung doppelt vor, liefen die beiden Fassungen
// früher oder später auseinander — und dann stünde eine Überschrift über
// einer leeren Zeile oder eine Zahl neben der falschen Menge Knöpfe.

export type OpenForm =
  | "missionLog"
  | "dialogue"
  | "event"
  | "archiveEntry"
  | "npc"
  | "mission";

export const NEW_CONTENT_FORMS: readonly OpenForm[] = [
  "missionLog",
  "dialogue",
  "event",
  "archiveEntry",
  "npc",
  "mission",
];

export const NEW_CONTENT_TITLES: Record<OpenForm, string> = {
  missionLog: "Neuen Missionslog anlegen",
  dialogue: "Neues Gespräch beginnen",
  event: "Neues Event anlegen",
  archiveEntry: "Neuen Datenbank-Eintrag anlegen",
  npc: "Neuen NPC anlegen",
  mission: "Neue Mission anlegen",
};

export const NEW_CONTENT_LABELS: Record<OpenForm, string> = {
  missionLog: "Neuer Missionslog",
  dialogue: "Neues Gespräch",
  event: "Neues Event",
  archiveEntry: "Neuer Datenbank-Eintrag",
  npc: "Neuer NPC",
  mission: "Neue Mission",
};

// Die Knöpfe, die wirklich dastehen. Zwei Bedingungen, und beide zählen:
//
//   - `show` sagt, welche Knöpfe diese Seite überhaupt anbietet (das Dashboard
//     reicht die dort eingeschalteten durch, „Meine Inhalte" reicht nichts
//     durch und bekommt alle).
//   - Die Daten sagen, welche für dieses Konto möglich sind: Missionslog und
//     Gespräch setzen einen eigenen veröffentlichten Charakter voraus, eine
//     Mission die Spielleitung, ein Event das allgemeine Anlegerecht. Fehlt
//     die Voraussetzung, ist der zugehörige Teil in NewContentData null.
//
// Datenbank-Eintrag und NPC stehen jedem eingeloggten Konto offen — der
// Server prüft dort nur die Session (siehe archiveEntryAction).
export function visibleNewContentForms(
  data: NewContentData,
  show?: readonly OpenForm[],
): OpenForm[] {
  return NEW_CONTENT_FORMS.filter((form) => {
    if (show && !show.includes(form)) return false;
    if (form === "missionLog") return data.missionLog !== null;
    if (form === "dialogue") return data.dialogue !== null;
    if (form === "event") return data.event !== null;
    if (form === "mission") return data.mission !== null;
    return true;
  });
}

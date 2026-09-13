import type { Character, CharacterMetadata } from "@/types/character";

// Gemeinsame Darstellung des Charakter-Status — React-/DB-frei, damit sie in
// Server-, Client-Komponenten UND Tests nutzbar ist (gleiches Muster wie
// archiveFormat.ts / contentTypeFormat.ts).
//
// Hintergrund: Labels und Farben lagen vorher vierfach nebeneinander
// (öffentliche Charakterliste, Charakter-Personalakte, „Meine Charaktere",
// Kopfdaten-Panel und das Status-Auswahlfeld) und wichen dabei voneinander ab:
// `retired` hieß mal „Inaktiv", mal „Ehemalig", und `active` war einmal
// senary, einmal tertiary eingefärbt. Diese Datei ist die EINE Quelle dafür.

export type CharacterStatus = Character["status"];

// Reihenfolge = Anzeigereihenfolge in Gruppierungen und Auswahlfeldern.
export const CHARACTER_STATUS_ORDER: CharacterStatus[] = [
  "active",
  "retired",
  "deceased",
];

export const CHARACTER_STATUS_LABEL: Record<CharacterStatus, string> = {
  active: "Aktiv",
  retired: "Inaktiv",
  deceased: "Verstorben",
};

// Akzentfarbe des Status — trägt Bedeutung (Zustand des Charakters) und ist
// deshalb, anders als frühere dekorative Farbrotationen, bewusst farbig.
export const CHARACTER_STATUS_COLOR: Record<CharacterStatus, string> = {
  active: "var(--lcars-tertiary)",
  retired: "var(--lcars-primary)",
  deceased: "var(--lcars-quinary)",
};

// Dezent hinterlegte Fläche zum jeweiligen Status (Status-Badge auf der
// Personalakte). Bewusst rgba statt eines Tokens: die Fläche soll den
// Hintergrund nur leicht einfärben, unabhängig vom gewählten Farbthema.
export const CHARACTER_STATUS_BG: Record<CharacterStatus, string> = {
  active: "rgba(154,154,255,.15)",
  retired: "rgba(255,154,0,.15)",
  deceased: "rgba(205,102,102,.15)",
};

// Optionen für Auswahlfelder (Charakter anlegen/bearbeiten).
export const CHARACTER_STATUS_OPTIONS: { value: CharacterStatus; label: string }[] =
  CHARACTER_STATUS_ORDER.map((value) => ({
    value,
    label: CHARACTER_STATUS_LABEL[value],
  }));

// metadata ist jsonb: Was beim Anlegen nicht geschrieben wurde, FEHLT dort
// schlicht — bei eingespielten Akten aus dem Vault und bei allem, was vor der
// Einführung eines Felds entstanden ist. Der Typ CharacterMetadata verspricht
// aber Listen, und jede Anzeige, die darauf .length oder .join aufruft (die
// Akte auf der Charakterseite, das Stammdaten-Panel der eigenen Seite), stürbe
// an dem undefined mit „Cannot read properties of undefined (reading
// 'length')". Deshalb werden die Listen hier EINMAL an der Lesekante
// aufgefüllt, statt an jeder Anzeigestelle einzeln abgesichert.
export function normalizeCharacterMetadata(
  raw: CharacterMetadata | null | undefined,
): CharacterMetadata {
  const metadata = (raw ?? {}) as CharacterMetadata;
  const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);
  return {
    ...metadata,
    rank: metadata.rank ?? null,
    homeworld: metadata.homeworld ?? null,
    age: metadata.age ?? null,
    dateOfBirth: metadata.dateOfBirth ?? null,
    affiliation: metadata.affiliation ?? null,
    player: metadata.player ?? null,
    species: list<string>(metadata.species),
    aliases: list<string>(metadata.aliases),
    tags: list<string>(metadata.tags),
    generation: list<number>(metadata.generation),
  };
}

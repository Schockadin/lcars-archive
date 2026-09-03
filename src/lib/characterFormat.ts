import type { Character } from "@/types/character";

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

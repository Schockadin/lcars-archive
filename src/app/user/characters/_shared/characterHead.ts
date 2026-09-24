import "server-only";
import { parseList, parseNumberList } from "@/lib/formParsing";
import { uploadCharacterPortraitImage } from "@/lib/characterAssets";
import { InvalidAssetError } from "@/lib/assetStorage";
import {
  isDefaultCrop,
  parsePortraitCrop,
  type PortraitCrop,
} from "@/lib/portraitCrop";
import type { Character } from "@/types/character";

// Die Stammdaten der Charakter-Akte aus einem Formular lesen — geteilt vom
// Anlege-Assistenten (wizardAction.ts) und dem Stammdaten-Panel der
// Charakterseite (panelActions.ts), die dieselben Felder tragen. Eine
// Auswertung für beide Wege statt zweier, die auseinanderlaufen.

const VALID_STATUSES: Character["status"][] = ["active", "retired", "deceased"];

export interface CharacterPortraitInput {
  portrait: string | null;
  // Das Original aus dem Altbestand: dort steht in portrait das eingebackene
  // Bild und hier das Bild, aus dem es geschnitten wurde. Neue Datensätze
  // führen das Original direkt in portrait und lassen dieses Feld leer (siehe
  // src/lib/portraitCrop.ts).
  portraitSource: string | null;
  portraitCrop: PortraitCrop | null;
}

export interface CharacterHeadInput extends CharacterPortraitInput {
  name: string;
  status: Character["status"];
  rank: string | null;
  species: string[];
  homeworld: string | null;
  aliases: string[];
  age: number | null;
  dateOfBirth: string | null;
  generation: number[];
  factions: string[];
  ships: string[];
  division: string | null;
  tags: string[];
}

export type CharacterHeadResult =
  | { head: CharacterHeadInput }
  | { error: string };
export type CharacterPortraitResult =
  | { portrait: CharacterPortraitInput }
  | { error: string };

// Was am Charakter schon gespeichert ist. Wird beim Bearbeiten mitgegeben,
// damit ein Speichern ohne neues Bild das vorhandene behält — das Formular
// trägt das Portrait nicht mehr mit sich (siehe unten).
export interface CurrentPortrait {
  portrait: string | null;
  portraitSource: string | null;
  // Der bisher gespeicherte Ausschnitt — er bleibt stehen, wenn das Formular
  // gar kein Ausschnitt-Feld mitschickt.
  portraitCrop?: unknown;
}

// Liest ausschließlich Bilddatei und Ausschnitt. Die Personalakte verwendet
// dieselbe Funktion weiterhin, wenn sie aus dem Anlege-Assistenten kommt; auf
// der bestehenden Charakterseite ruft das eigene Profilbild-Panel sie direkt
// auf. So gelten Upload- und Sicherheitsregeln an beiden Stellen identisch.
export async function readCharacterPortrait(
  formData: FormData,
  current?: CurrentPortrait | null,
): Promise<CharacterPortraitResult> {
  // Portrait: eine hochgeladene Datei — sonst bleibt stehen, was schon
  // gespeichert ist. Hochgeladen wird das ORIGINAL; der gewählte Ausschnitt
  // ist eine Anweisung dazu (Zoom + Mittelpunkt) und wird erst beim Anzeigen
  // angewandt (siehe src/lib/portraitCrop.ts).
  //
  // Eine Bild-ADRESSE gibt es nicht mehr: Der Server liest kein Adressfeld aus
  // dem Formular, sondern nimmt den bisherigen Stand vom Aufrufer entgegen.
  let portrait = current?.portrait ?? null;
  let portraitSource = current?.portraitSource ?? null;

  const portraitFile = formData.get("portraitFile");
  if (portraitFile instanceof File && portraitFile.size > 0) {
    try {
      portrait = await uploadCharacterPortraitImage({
        buffer: Buffer.from(await portraitFile.arrayBuffer()),
        mimeType: portraitFile.type,
      });
      // Das hochgeladene Bild ist das neue Original; der Altbestands-Zeiger
      // auf ein früheres Original darf nicht weiterverwendet werden.
      portraitSource = null;
    } catch (err) {
      if (err instanceof InvalidAssetError) return { error: err.message };
      throw err;
    }
  }

  // Fehlt das Feld ganz (z.B. Personalakte ohne Portrait-Bereich), bleibt der
  // gespeicherte Ausschnitt stehen.
  const cropField = formData.get("portraitCrop");
  const crop =
    cropField === null
      ? parsePortraitCrop(current?.portraitCrop)
      : parsePortraitCrop(safeJson(cropField));

  return {
    portrait: {
      portrait,
      portraitSource,
      portraitCrop: isDefaultCrop(crop) ? null : crop,
    },
  };
}

export async function readCharacterHead(
  formData: FormData,
  current?: CurrentPortrait | null,
): Promise<CharacterHeadResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen angeben." };

  const status = String(formData.get("status") ?? "");
  if (!VALID_STATUSES.includes(status as Character["status"])) {
    return { error: "Ungültiger Status." };
  }

  const portraitResult = await readCharacterPortrait(formData, current);
  if ("error" in portraitResult) return portraitResult;

  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = ageRaw ? Number(ageRaw) : null;
  if (ageRaw && !Number.isInteger(age)) {
    return { error: "Ungültiges Alter." };
  }

  // Geburtsdatum (optional) — nur das Datum (YYYY-MM-DD), aus dem später
  // zusammen mit dem Ingame-Jahr das Alter abgeleitet wird (siehe
  // inferAgeFromDateOfBirth). Ein <input type="date"> liefert bereits das
  // ISO-Format; wir prüfen defensiv nach.
  const dobRaw = String(formData.get("dateOfBirth") ?? "").trim();
  if (dobRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
    return { error: "Ungültiges Geburtsdatum." };
  }

  return {
    head: {
      name,
      status: status as Character["status"],
      ...portraitResult.portrait,
      rank: String(formData.get("rank") ?? "").trim() || null,
      species: parseList(formData.get("species")),
      homeworld: String(formData.get("homeworld") ?? "").trim() || null,
      aliases: parseList(formData.get("aliases")),
      age,
      dateOfBirth: dobRaw || null,
      generation: parseNumberList(formData.get("generation")),
      factions: parseList(formData.get("factions")),
      ships: parseList(formData.get("ships")),
      division: String(formData.get("division") ?? "").trim() || null,
      tags: parseList(formData.get("tags")),
    },
  };
}

// Das Formular liefert die Einstellung als JSON. Ein kaputter Wert darf das
// Speichern nicht scheitern lassen — parsePortraitCrop fällt dann auf die
// Vorgabe zurück.
function safeJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

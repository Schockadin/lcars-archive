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

export interface CharacterHeadInput {
  name: string;
  status: Character["status"];
  portrait: string | null;
  // Das Original aus dem Altbestand: dort steht in portrait das eingebackene
  // Bild und hier das Bild, aus dem es geschnitten wurde. Neue Datensätze
  // führen das Original direkt in portrait und lassen dieses Feld leer (siehe
  // src/lib/portraitCrop.ts).
  portraitSource: string | null;
  portraitCrop: PortraitCrop | null;
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

  // Portrait: eine hochgeladene Datei — sonst bleibt stehen, was schon
  // gespeichert ist. Hochgeladen wird das ORIGINAL; der gewählte Ausschnitt
  // ist eine Anweisung dazu (Zoom + Mittelpunkt) und wird erst beim Anzeigen
  // angewandt (siehe src/lib/portraitCrop.ts). Bis v1.29.57 buk der Browser
  // den Ausschnitt in ein zweites Bild ein und lud dieses hoch.
  //
  // Eine Bild-ADRESSE gibt es nicht mehr: ein Portrait, das auf einem fremden
  // Server liegt, verschwindet, wenn dort jemand aufräumt, lässt sich hier
  // nicht zuschneiden (die Leinwand wird „verunreinigt", siehe
  // PortraitPicker) und meldet jeden Aufruf des Bogens an diesen Server.
  // Deshalb liest diese Funktion auch KEIN Adressfeld mehr aus dem Formular,
  // sondern nimmt den bisherigen Stand vom Aufrufer entgegen — eine Adresse
  // kann damit gar nicht mehr aus einem Formular kommen, auch nicht aus einem
  // von Hand zusammengebauten.
  //
  let portrait = current?.portrait ?? null;
  let portraitSource = current?.portraitSource ?? null;

  const portraitFile = formData.get("portraitFile");
  if (portraitFile instanceof File && portraitFile.size > 0) {
    try {
      const uploaded = await uploadCharacterPortraitImage({
        buffer: Buffer.from(await portraitFile.arrayBuffer()),
        mimeType: portraitFile.type,
      });
      // Die hochgeladene Datei IST das Portrait — unbeschnitten. Der
      // Altbestands-Zeiger auf ein früheres Original wird damit gegenstandslos
      // und fällt weg, sonst zeigte der Bogen weiter das alte Bild.
      portrait = uploaded;
      portraitSource = null;
    } catch (err) {
      if (err instanceof InvalidAssetError) return { error: err.message };
      throw err;
    }
  }

  // Der Ausschnitt: das Formular schickt ihn immer mit (PortraitPicker), auch
  // wenn nur er geändert wurde. Fehlt das Feld ganz — ein Formular ohne
  // Portrait-Bereich —, bleibt der gespeicherte Wert stehen.
  const cropField = formData.get("portraitCrop");
  const crop =
    cropField === null
      ? parsePortraitCrop(current?.portraitCrop)
      : parsePortraitCrop(safeJson(cropField));
  // Ein unveränderter Ausschnitt braucht nicht gespeichert zu werden — er ist
  // die Vorgabe.
  const portraitCrop: PortraitCrop | null = isDefaultCrop(crop) ? null : crop;

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
      portrait,
      portraitSource,
      portraitCrop,
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

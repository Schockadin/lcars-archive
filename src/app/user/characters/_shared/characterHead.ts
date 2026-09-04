import "server-only";
import { parseList, parseNumberList } from "@/lib/formParsing";
import { uploadCharacterPortraitImage } from "@/lib/characterAssets";
import { InvalidAssetError } from "@/lib/assetStorage";
import type { Character } from "@/types/character";

// Die Stammdaten der Charakter-Akte aus einem Formular lesen — geteilt von
// characterAction (Anlegen/Bearbeiten über den ContentEditor) und der Action
// des Anlege-Assistenten, die dieselben Felder in ihrem ersten Schritt hat.
// Vorher stand diese Auswertung nur in characterAction; der Assistent hätte
// sie sonst Feld für Feld nachbauen müssen, mit dem üblichen Risiko, dass die
// beiden Fassungen auseinanderlaufen.

const VALID_STATUSES: Character["status"][] = ["active", "retired", "deceased"];

export interface CharacterHeadInput {
  name: string;
  status: Character["status"];
  portrait: string | null;
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

export async function readCharacterHead(
  formData: FormData,
): Promise<CharacterHeadResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen angeben." };

  const status = String(formData.get("status") ?? "");
  if (!VALID_STATUSES.includes(status as Character["status"])) {
    return { error: "Ungültiger Status." };
  }

  // Portrait: entweder eine eingegebene URL oder eine hochgeladene Datei —
  // die Datei hat Vorrang und landet direkt im öffentlichen Asset-Bucket, ihre
  // URL wird als portrait übernommen.
  let portrait = String(formData.get("portrait") ?? "").trim() || null;
  const portraitFile = formData.get("portraitFile");
  if (portraitFile instanceof File && portraitFile.size > 0) {
    try {
      portrait = await uploadCharacterPortraitImage({
        buffer: Buffer.from(await portraitFile.arrayBuffer()),
        mimeType: portraitFile.type,
      });
    } catch (err) {
      if (err instanceof InvalidAssetError) return { error: err.message };
      throw err;
    }
  }

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

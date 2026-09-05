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

// Die Stammdaten der Charakter-Akte aus einem Formular lesen — geteilt von
// characterAction (Anlegen/Bearbeiten über den ContentEditor) und der Action
// des Anlege-Assistenten, die dieselben Felder in ihrem ersten Schritt hat.
// Vorher stand diese Auswertung nur in characterAction; der Assistent hätte
// sie sonst Feld für Feld nachbauen müssen, mit dem üblichen Risiko, dass die
// beiden Fassungen auseinanderlaufen.

const VALID_STATUSES: Character["status"][] = ["active", "retired", "deceased"];

// Wie groß eine zugeschnittene Vorschau höchstens sein darf, bevor sie
// abgewiesen wird. Der Browser liefert rund 390 × 434 Bildpunkte als JPEG,
// das sind wenige hundert Kilobyte — 4 MB sind reichlich Luft und ziehen
// zugleich eine Grenze gegen missbräuchlich große Data-URLs.
const MAX_CROPPED_BYTES = 4 * 1024 * 1024;

export interface CharacterHeadInput {
  name: string;
  status: Character["status"];
  portrait: string | null;
  // Das Original, aus dem der Ausschnitt geschnitten wurde, und die
  // Einstellung dazu — damit sich der Ausschnitt später neu wählen lässt,
  // ohne die Datei erneut zu suchen (siehe src/lib/portraitCrop.ts).
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

export async function readCharacterHead(
  formData: FormData,
): Promise<CharacterHeadResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen angeben." };

  const status = String(formData.get("status") ?? "");
  if (!VALID_STATUSES.includes(status as Character["status"])) {
    return { error: "Ungültiger Status." };
  }

  // Portrait: eine eingegebene URL, eine hochgeladene Datei oder ein im
  // Browser zugeschnittener Ausschnitt. Reihenfolge: der Zuschnitt gewinnt,
  // dann die Datei, zuletzt die URL.
  //
  // Der Zuschnitt kommt als Data-URL aus dem PortraitPicker — dort wird er
  // auf einer Leinwand im Seitenverhältnis des Bildkastens gezeichnet. Er wird
  // wie jedes andere Bild in den Asset-Bucket geladen; Bogen und PDF sehen
  // danach nur noch ein Bild, das ohnehin passt.
  let portrait = String(formData.get("portrait") ?? "").trim() || null;
  let portraitSource = String(formData.get("portraitSource") ?? "").trim() || null;

  const portraitFile = formData.get("portraitFile");
  if (portraitFile instanceof File && portraitFile.size > 0) {
    try {
      const uploaded = await uploadCharacterPortraitImage({
        buffer: Buffer.from(await portraitFile.arrayBuffer()),
        mimeType: portraitFile.type,
      });
      portrait = uploaded;
      // Die hochgeladene Datei IST das Original — ein späterer Zuschnitt geht
      // von ihr aus, nicht vom bereits beschnittenen Ergebnis.
      portraitSource = uploaded;
    } catch (err) {
      if (err instanceof InvalidAssetError) return { error: err.message };
      throw err;
    }
  }

  let portraitCrop: PortraitCrop | null = null;
  const croppedRaw = String(formData.get("portraitCropped") ?? "").trim();
  if (croppedRaw) {
    const decoded = decodeDataUrl(croppedRaw);
    if (!decoded) return { error: "Der Bildausschnitt ist unbrauchbar." };
    if (decoded.buffer.byteLength > MAX_CROPPED_BYTES) {
      return { error: "Der Bildausschnitt ist zu groß." };
    }
    try {
      portrait = await uploadCharacterPortraitImage(decoded);
    } catch (err) {
      if (err instanceof InvalidAssetError) return { error: err.message };
      throw err;
    }
    const crop = parsePortraitCrop(safeJson(formData.get("portraitCrop")));
    // Ein unveränderter Ausschnitt braucht nicht gespeichert zu werden — er
    // ist die Vorgabe.
    portraitCrop = isDefaultCrop(crop) ? null : crop;
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

// Eine Data-URL in Bytes zerlegen. Nur Bilder werden angenommen; welche
// genau, entscheidet weiterhin assertImageAsset beim Hochladen.
function decodeDataUrl(
  value: string,
): { buffer: Buffer; mimeType: string } | null {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(
    value,
  );
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  if (!mimeType.startsWith("image/")) return null;
  try {
    const buffer = Buffer.from(match[2], "base64");
    return buffer.byteLength > 0 ? { buffer, mimeType } : null;
  } catch {
    return null;
  }
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

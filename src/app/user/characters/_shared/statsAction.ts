"use server";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import {
  updateOwnCharacterStats,
  updateOwnCharacterPortrait,
  getOwnCharacterStats,
} from "@/lib/characters";
import { uploadCharacterPortraitImage } from "@/lib/characterAssets";
import { InvalidAssetError } from "@/lib/assetStorage";
import { revalidateCharacter } from "@/lib/revalidate";
import { revalidatePath } from "next/cache";
import { parseLines } from "@/lib/formParsing";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  SCALAR_NUMBER_FIELDS,
  TEXT_FIELDS,
  LIST_FIELDS,
  EMPTY_CHARACTER_STATS,
  isCharacterExperience,
  validateCharacterStats,
  type NumberFieldSpec,
} from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";

export interface CharacterStatsFormState {
  error?: string;
}

// Leeres Feld = Wert nicht gepflegt (null), NICHT 0 — auf einem
// Charakterbogen ist "keine Angabe" etwas anderes als eine gewürfelte 0.
function readNumber<K>(
  formData: FormData,
  field: NumberFieldSpec<K>,
  name: string,
): { value: number | null } | { error: string } {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return { value: null };

  const num = Number(raw);
  if (!Number.isInteger(num)) {
    return { error: `${field.label}: bitte eine ganze Zahl angeben.` };
  }
  if (num < field.min || num > field.max) {
    return {
      error: `${field.label}: Wert muss zwischen ${field.min} und ${field.max} liegen.`,
    };
  }
  return { value: num };
}

function readText(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

// Charakterwerte eines eigenen Charakters speichern (siehe
// /user/characters/[characterId]/stats). Aufbau wie die übrigen
// Content-Actions im User-Bereich (characters/_shared/contentAction.ts):
// Session prüfen, Formular-userId gegen die Session abgleichen, von Hand
// validieren (kein zod im Projekt) und die Berechtigung über das
// owner-gescopte UPDATE selbst durchsetzen — eine gefälschte characterId
// trifft dort 0 Zeilen.
export async function characterStatsAction(
  state: CharacterStatsFormState,
  formData: FormData,
): Promise<CharacterStatsFormState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  const stats: CharacterStats = {
    ...EMPTY_CHARACTER_STATS,
    attributes: { ...EMPTY_CHARACTER_STATS.attributes },
    departments: { ...EMPTY_CHARACTER_STATS.departments },
  };

  for (const field of ATTRIBUTE_FIELDS) {
    const result = readNumber(formData, field, `attributes.${field.key}`);
    if ("error" in result) return { error: result.error };
    stats.attributes[field.key] = result.value;
  }
  for (const field of DEPARTMENT_FIELDS) {
    const result = readNumber(formData, field, `departments.${field.key}`);
    if ("error" in result) return { error: result.error };
    stats.departments[field.key] = result.value;
  }
  for (const field of SCALAR_NUMBER_FIELDS) {
    const result = readNumber(formData, field, field.key);
    if ("error" in result) return { error: result.error };
    stats[field.key] = result.value;
  }
  for (const field of TEXT_FIELDS) {
    stats[field.key] = readText(formData, field.key);
  }
  for (const field of LIST_FIELDS) {
    stats[field.key] = parseLines(formData.get(field.key));
  }

  const experience = String(formData.get("experience") ?? "").trim();
  if (experience && !isCharacterExperience(experience)) {
    return { error: "Ungültige Erfahrungsstufe." };
  }
  stats.experience = isCharacterExperience(experience) ? experience : null;

  // Ist die Erschaffung abgeschlossen, sind Attribute, Disziplinen, Talente
  // und Schwerpunkte nur noch per AP-Steigerung veränderbar (siehe
  // advancementAction.ts). Das Formular zeigt sie dann schreibgeschützt an —
  // maßgeblich ist aber diese Prüfung: die gespeicherten Werte gewinnen,
  // egal was im Formular stand.
  const current = await getOwnCharacterStats(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }
  stats.creationLocked = current.stats.creationLocked;
  if (current.stats.creationLocked) {
    stats.attributes = current.stats.attributes;
    stats.departments = current.stats.departments;
    stats.talents = current.stats.talents;
    stats.focuses = current.stats.focuses;
  }

  // Verteilungsregeln (nur ein Attribut auf 12, zwei auf 11, analog bei den
  // Disziplinen) — hier verbindlich geprüft, nicht nur im Formular: die
  // Eingabegrenzen im Browser sind Komfort, maßgeblich ist der Server.
  const ruleErrors = validateCharacterStats(stats);
  if (ruleErrors.length > 0) {
    return { error: ruleErrors.join(" ") };
  }

  // Foto-Kasten des Bogens: pflegt dasselbe Bild wie das Kopf-Formular
  // (characters.portrait), inkl. derselben Typ-/Größenprüfung. Vor dem
  // Speichern der Werte hochladen — schlägt der Upload fehl, bricht die Action
  // ab, statt halb gespeicherte Daten zu hinterlassen.
  const photoFile = formData.get("portraitFile");
  if (photoFile instanceof File && photoFile.size > 0) {
    let portraitUrl: string;
    try {
      portraitUrl = await uploadCharacterPortraitImage({
        buffer: Buffer.from(await photoFile.arrayBuffer()),
        mimeType: photoFile.type,
      });
    } catch (err) {
      if (err instanceof InvalidAssetError) return { error: err.message };
      throw err;
    }
    const updated = await updateOwnCharacterPortrait(
      session.userId,
      characterId,
      portraitUrl,
    );
    if (!updated) {
      return { error: "Charakter nicht gefunden oder keine Berechtigung." };
    }
  }

  const result = await updateOwnCharacterStats(
    session.userId,
    characterId,
    stats,
  );
  if (!result) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  // Die Werte hängen an der Charakter-Akte (metadata) — deren Cache-Tags
  // müssen mit, damit z.B. die Charakterseite frische Daten bekommt.
  revalidateCharacter(result.slug);
  revalidatePath("/user/characters");
  revalidatePath(`/user/characters/${characterId}/stats`);

  // Bewusst KEINE Abonnenten-Benachrichtigung (anders als beim Bearbeiten der
  // Akte, siehe contentAction.ts): Werte ändern sich im Spielbetrieb ständig
  // (Stress, Entschlossenheit) — jede Änderung zu melden wäre Spam.
  return {};
}

import { parseTalentEntry } from "@/lib/talentCatalog";
import { validateCharacterStats } from "@/lib/characterStats";
import type { AdvancementRules } from "@/lib/advancement";
import type { CharacterStats } from "@/types/characterStats";

// Regelprüfungen für einen zu speichernden Wertesatz — dieselben, egal ob der
// Bogen gerade angelegt (Assistent) oder später bearbeitet wird
// (Werte-Panel). Bewusst DB-frei und ohne Server-Bindung, damit sie sich
// testen lassen; die Aufrufer laden Katalog und Regelwerk und reichen sie
// herein.

// Talente kommen ausschließlich aus dem Katalog (siehe TalentPicker) — die
// Formulare bieten gar nichts anderes an, verbindlich ist aber diese Prüfung.
// Bereits gespeicherte Einträge bleiben erlaubt, auch wenn sie nicht (mehr) im
// Katalog stehen: sonst ließe sich ein Bogen mit Alt-Bestand aus der
// Freitext-Zeit überhaupt nicht mehr speichern.
export function checkTalentsFromCatalog(
  talents: string[],
  catalogNames: string[],
  alreadyStored: string[] = [],
): string | null {
  const known = new Set(catalogNames.map((name) => name.toLowerCase()));
  const stored = new Set(alreadyStored.map((entry) => entry.toLowerCase()));
  const unknown = talents.filter(
    (entry) =>
      !known.has(parseTalentEntry(entry).original.toLowerCase()) &&
      !stored.has(entry.toLowerCase()),
  );
  if (unknown.length === 0) return null;
  return `Unbekanntes Talent: ${unknown.join(", ")}. Talente werden aus dem Katalog gewählt.`;
}

// Freikontingente der Ersterschaffung. Talente und Schwerpunkte kosten danach
// AP, ihr Kontingent ist deshalb eine harte Grenze. Werte (values) bleiben
// ungedeckelt: sie lassen sich später nicht kaufen, ein hartes Limit würde
// eine Vergabe durch die Spielleitung blockieren.
export function checkCreationFreeCounts(
  stats: CharacterStats,
  rules: AdvancementRules,
): string | null {
  if (stats.talents.length > rules.creationFreeTalents) {
    return `Die Ersterschaffung erlaubt ${rules.creationFreeTalents} Talente — ${stats.talents.length} sind eingetragen. Weitere kosten AP.`;
  }
  if (stats.focuses.length > rules.creationFreeFocuses) {
    return `Die Ersterschaffung erlaubt ${rules.creationFreeFocuses} Schwerpunkte — ${stats.focuses.length} sind eingetragen. Weitere kosten AP.`;
  }
  return null;
}

// Alles zusammen für einen Bogen, dessen Erschaffung noch offen ist: Talente
// aus dem Katalog, Freikontingente und die Verteilungsregeln (nur ein Attribut
// auf 12, zwei auf 11 usw.).
export function checkOpenCreationStats(
  stats: CharacterStats,
  rules: AdvancementRules,
  catalogNames: string[],
  alreadyStored: string[] = [],
): string | null {
  const talentError = checkTalentsFromCatalog(
    stats.talents,
    catalogNames,
    alreadyStored,
  );
  if (talentError) return talentError;

  const freeError = checkCreationFreeCounts(stats, rules);
  if (freeError) return freeError;

  const ruleErrors = validateCharacterStats(stats);
  return ruleErrors.length > 0 ? ruleErrors.join(" ") : null;
}

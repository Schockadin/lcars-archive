// Charakterwerte („Personalakte" nach Star Trek Adventures 2e) eines
// Charakters — Attribute, Disziplinen, abgeleitete Werte und die
// Listenfelder des offiziellen Charakterbogens.
//
// Bewusst NICHT zu verwechseln mit src/lib/characterSheets.ts: das sind die
// hochgeladenen PDF-Charakterbögen (reine Dateiablage). Hier geht es um die
// strukturierten Werte, die unter /user/characters gepflegt werden.
//
// Gespeichert werden sie als characters.metadata.stats (jsonb) — dieselbe
// Spalte wie Rang/Spezies/Alter, daher ohne eigene Tabelle bzw. Migration.
// Name, Rang und Spezies stehen bereits am Charakter selbst und werden hier
// deshalb NICHT dupliziert.

export interface CharacterAttributes {
  control: number | null;
  daring: number | null;
  fitness: number | null;
  insight: number | null;
  presence: number | null;
  reason: number | null;
}

export interface CharacterDepartments {
  command: number | null;
  conn: number | null;
  engineering: number | null;
  security: number | null;
  medicine: number | null;
  science: number | null;
}

// Erfahrungsstufe (STA 2e: Novice/Experienced/Veteran). Gespeichert wird der
// englische Schlüssel, angezeigt das deutsche Label (siehe EXPERIENCE_OPTIONS).
export type CharacterExperience = "novice" | "experienced" | "veteran";

export interface CharacterStats {
  // Ersterschaffung abgeschlossen? Solange false, sind Attribute und
  // Disziplinen frei editierbar und laufen gegen die Erschaffungsbudgets
  // (320/320 AP, siehe src/lib/advancement.ts). Danach lassen sie sich nur
  // noch über AP-Steigerungen erhöhen.
  creationLocked: boolean;

  // ── Kopf der Personalakte ────────────────────────────────────────
  pronouns: string | null;
  characterRole: string | null;
  assignment: string | null;
  environment: string | null;
  upbringing: string | null;
  careerPath: string | null;
  experience: CharacterExperience | null;
  // Zusätzliche Merkmale neben der Spezies (Bogen: „Species & Traits").
  traits: string | null;
  careerEvents: string[];

  // ── Zahlenwerte ──────────────────────────────────────────────────
  reputation: number | null;
  attributes: CharacterAttributes;
  departments: CharacterDepartments;
  // Stress selbst wird NICHT gespeichert, sondern aus Fitness + Talent-Bonus
  // berechnet (computeStress in src/lib/characterStats.ts). Gespeichert wird
  // nur der Bonus, den Talente auf den maximalen Stress geben (z.B. „Resolut:
  // +3 max. Stress") — der lässt sich aus dem Freitext der Talente nicht
  // verlässlich herauslesen und wird deshalb separat gepflegt.
  stressBonus: number | null;
  resistance: number | null;
  // 0–3 gefüllte Determinationskästchen des Bogens.
  determination: number | null;

  // ── Listenfelder (je Zeile ein Eintrag) ──────────────────────────
  values: string[];
  focuses: string[];
  talents: string[];
  pastimes: string[];
  attacks: string[];
  speciesAbilities: string[];
  specialRules: string[];
  equipment: string[];
}

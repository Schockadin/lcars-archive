// Charakterwerte („Personalakte" nach Star Trek Adventures 2e) eines
// Charakters — Attribute, Disziplinen, abgeleitete Werte und die
// Listenfelder des offiziellen Charakterbogens.
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

// Eine Steigerung, die beim erneuten Öffnen der Erschaffung zurückgenommen
// wurde (siehe src/lib/creationReset.ts). Die Werte sind dabei auf den Stand
// vor der Steigerung zurückgefallen und die AP wieder gutgeschrieben — die
// Notiz hier hält fest, WAS zurückgenommen wurde, damit dieselbe Steigerung
// beim erneuten Abschließen der Erschaffung automatisch wieder angewandt
// werden kann.
export interface PendingAdvancement {
  kind: "attribute" | "department" | "talent" | "focus";
  // Bei attribute/department: der Schlüssel des Werts (z.B. "control").
  key: string | null;
  // Bei talent/focus: der Eintrag, wie er auf dem Bogen stand.
  entry: string | null;
  // Klartext der ursprünglichen Buchung („Kontrolle 9 → 10", Talentname).
  label: string;
  // AP, die die Steigerung damals gekostet hat (beim erneuten Anwenden wird
  // mit den DANN geltenden Regeln neu gerechnet).
  cost: number;
  // Zeitpunkt der ursprünglichen Buchung — die Reihenfolge der Liste ist
  // chronologisch, ältestes zuerst.
  recordedAt: string;
}

export interface CharacterStats {
  // Ersterschaffung abgeschlossen? Solange false, sind Attribute und
  // Disziplinen frei editierbar und laufen gegen die Erschaffungsbudgets
  // (320/320 AP, siehe src/lib/advancement.ts). Danach lassen sie sich nur
  // noch über AP-Steigerungen erhöhen.
  creationLocked: boolean;

  // Zurückgenommene Steigerungen einer wieder geöffneten Erschaffung. Leer,
  // solange die Erschaffung nie zurückgesetzt wurde; beim Abschließen wird die
  // Liste abgearbeitet und wieder geleert.
  pendingAdvancements: PendingAdvancement[];

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

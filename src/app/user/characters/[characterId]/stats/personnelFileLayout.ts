// Feldpositionen des Charakterbogens — 1:1 aus der Vorlage
// (personnelfilesvgexactmockup.html) übernommen. Die Zahlen sind Pixel im
// 816×1056-Koordinatensystem des Blattes; die Grafik dahinter ist
// public/character-sheet/personnel-file.svg.
//
// Eigene Datei, damit die Komponente nur noch Felder rendert und die Maße
// nachprüfbar an einer Stelle stehen: ändert sich die Vorlage, ändert sich
// genau diese Tabelle.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  left: number;
  top: number;
}

// Alle Maße als Vielfache von --pf-unit (siehe personnel-file.css): das ist
// ein Pixel der Vorlage, solange das Blatt 816px breit ist, und schrumpft mit,
// wenn weniger Platz da ist. Dadurch bleibt die Anordnung in jeder Größe 1:1.
function unit(value: number): string {
  return `calc(${value} * var(--pf-unit))`;
}

export function boxStyle(box: Box): React.CSSProperties {
  return {
    left: unit(box.left),
    top: unit(box.top),
    width: unit(box.width),
    height: unit(box.height),
  };
}

export function pointStyle(point: Point): React.CSSProperties {
  return { left: unit(point.left), top: unit(point.top) };
}

// Für die Bedienelemente, die die Vorlage nicht kennt (Plus zum Hinzufügen,
// Zähler der Freikontingente): eine Position relativ zu einem Kasten.
export function offsetStyle(
  box: Box,
  dx: number,
  dy: number,
): React.CSSProperties {
  return { left: unit(box.left + dx), top: unit(box.top + dy) };
}

// Der Bildkasten oben links. Die Vorlage lässt ihn leer (sie kennt kein
// Bildfeld); die Maße stammen aus der Grafik selbst — die gedruckte Umrandung
// liegt bei x 60…263 und y 76…301, das Bild sitzt mit etwas Luft darin.
export const PHOTO_BOX: Box = {
  left: 64,
  top: 80,
  width: 195,
  height: 217,
};

// Kopfbereich (rechte Blatthälfte oben).
export const HEAD_BOXES = {
  name: { left: 272, top: 101, width: 363, height: 37 },
  pronouns: { left: 642, top: 101, width: 129, height: 37 },
  rank: { left: 272, top: 145, width: 241, height: 36 },
  assignment: { left: 521, top: 145, width: 250, height: 36 },
  characterRole: { left: 272, top: 186, width: 363, height: 37 },
  reputation: { left: 642, top: 186, width: 129, height: 37 },
  traits: { left: 272, top: 229, width: 499, height: 36 },
  environment: { left: 272, top: 274, width: 243, height: 68 },
  upbringing: { left: 523, top: 274, width: 248, height: 68 },
  careerPath: { left: 272, top: 353, width: 243, height: 69 },
  experience: { left: 523, top: 353, width: 248, height: 69 },
  careerEvent1: { left: 272, top: 431, width: 243, height: 69 },
  careerEvent2: { left: 523, top: 431, width: 248, height: 69 },
} as const satisfies Record<string, Box>;

// Attribute (linker Block) und Disziplinen (rechter Block) — die Reihenfolge
// auf dem Bogen ist spaltenweise, nicht alphabetisch.
//
// ABWEICHUNG von der Vorlage: dort liegen die sechs Attributsfelder bei
// x 195/307/419 mit 112 Breite und damit rund 50px rechts neben ihren
// gedruckten Kästen — der Wert für „Presence" landete im Disziplinen-Kasten
// „Command". In der Vorlage fällt das nicht auf, weil ihre Felder leer sind.
// Hier stehen die Maße der tatsächlich gedruckten Kästen (aus der Grafik
// ausgemessen: x 145…237, 246…338, 348…440). Die Disziplinen der Vorlage
// stimmen dagegen exakt und sind unverändert übernommen.
export const ATTRIBUTE_BOXES: Record<string, Box> = {
  control: { left: 145, top: 536, width: 92, height: 25 },
  fitness: { left: 246, top: 536, width: 92, height: 25 },
  presence: { left: 348, top: 536, width: 92, height: 25 },
  daring: { left: 145, top: 570, width: 92, height: 25 },
  insight: { left: 246, top: 570, width: 92, height: 25 },
  reason: { left: 348, top: 570, width: 92, height: 25 },
};

export const DEPARTMENT_BOXES: Record<string, Box> = {
  command: { left: 466, top: 536, width: 91, height: 25 },
  engineering: { left: 568, top: 536, width: 91, height: 25 },
  medicine: { left: 670, top: 536, width: 91, height: 25 },
  conn: { left: 466, top: 570, width: 91, height: 25 },
  security: { left: 568, top: 570, width: 91, height: 25 },
  science: { left: 670, top: 570, width: 91, height: 25 },
};

// Listenblöcke: links Werte/Schwerpunkte/Hobbys/Angriffe, rechts
// Spezies-Fähigkeit/Talente/Sonderregeln/Ausrüstung.
export const LIST_BOXES = {
  values: { left: 137, top: 611, width: 310, height: 104 },
  focuses: { left: 137, top: 723, width: 310, height: 121 },
  pastimes: { left: 137, top: 852, width: 310, height: 51 },
  attacks: { left: 137, top: 913, width: 310, height: 86 },
  speciesAbilities: { left: 459, top: 611, width: 311, height: 52 },
  talents: { left: 459, top: 673, width: 311, height: 187 },
  specialRules: { left: 459, top: 870, width: 311, height: 52 },
  equipment: { left: 459, top: 930, width: 311, height: 69 },
} as const satisfies Record<string, Box>;

// Abgeleitete Werte links oben: Entschlossenheit, Schutz, Stress.
export const DETERMINATION_POINTS: Point[] = [
  { left: 181, top: 326 },
  { left: 212, top: 326 },
  { left: 243, top: 326 },
];

export const RESISTANCE_BOX: Box = {
  left: 117,
  top: 361,
  width: 145,
  height: 35,
};

export const STRESS_VALUE_BOX: Box = {
  left: 60,
  top: 405,
  width: 48,
  height: 35,
};

// Die 19 Stress-Kästchen des Bogens, in der Reihenfolge der Vorlage.
export const STRESS_POINTS: Point[] = [
  { left: 120, top: 417 },
  { left: 151, top: 417 },
  { left: 181, top: 417 },
  { left: 211, top: 417 },
  { left: 242, top: 417 },
  { left: 60, top: 445 },
  { left: 91, top: 445 },
  { left: 120, top: 445 },
  { left: 151, top: 445 },
  { left: 181, top: 445 },
  { left: 211, top: 445 },
  { left: 242, top: 445 },
  { left: 60, top: 473 },
  { left: 91, top: 473 },
  { left: 120, top: 473 },
  { left: 151, top: 473 },
  { left: 181, top: 473 },
  { left: 211, top: 473 },
  { left: 242, top: 473 },
];

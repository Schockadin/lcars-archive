import type { CharacterAttributes, CharacterDepartments } from "@/types/characterStats";

export type CareerEventAttribute = keyof CharacterAttributes | "any";
export type CareerEventDepartment = keyof CharacterDepartments | "any";

export interface Sta2eCareerEvent {
  id: string;
  roll: number;
  title: string;
  summary: string;
  attribute: CareerEventAttribute;
  department: CareerEventDepartment;
  focusSuggestions: string[];
  optionalTrait?: string;
}

// STA 2e Lifepath, Step Six. Die Kurzbeschreibungen sind redaktionelle
// Zusammenfassungen; die Auswahlmöglichkeiten und mechanischen Benefits
// folgen dem Career-Event-Katalog des Core Rulebook.
export const STA2E_CAREER_EVENTS: readonly Sta2eCareerEvent[] = [
  {
    id: "betrayed-ideals-for-a-superior", roll: 1,
    title: "Betrayed Ideals for a Superior",
    summary: "Du hast die Anweisung einer vertrauten vorgesetzten Person über deine eigenen Ideale gestellt.",
    attribute: "presence", department: "command",
    focusSuggestions: ["Persuasion", "Inspiration", "Investigation"],
  },
  {
    id: "breakthrough-or-invention", roll: 2,
    title: "Breakthrough or Invention",
    summary: "Du hast eine wichtige Entdeckung gemacht oder eine neue technische Lösung entwickelt.",
    attribute: "any", department: "engineering",
    focusSuggestions: ["Experimental Technology", "Invention", "Improvisation"],
    optionalTrait: "Inventor of X",
  },
  {
    id: "called-out-a-superior", roll: 3,
    title: "Called Out a Superior",
    summary: "Du hast dich gegen eine vorgesetzte Person gestellt, um deinen Idealen zu folgen.",
    attribute: "reason", department: "conn",
    focusSuggestions: ["Uniform Code of Justice", "History", "Starfleet Protocol"],
  },
  {
    id: "conflict-with-a-hostile-culture", roll: 4,
    title: "Conflict with a Hostile Culture",
    summary: "Du warst an einem bewaffneten Konflikt mit einer feindseligen Macht beteiligt.",
    attribute: "fitness", department: "security",
    focusSuggestions: ["Hand Phasers", "Hand-to-Hand Combat", "Tactical Systems"],
  },
  {
    id: "dealt-with-a-plague", roll: 5,
    title: "Dealt with a Plague",
    summary: "Dein Schiff unterstützte eine Welt im Umgang mit einer Epidemie.",
    attribute: "insight", department: "medicine",
    focusSuggestions: ["Infectious Diseases", "Emergency Medicine", "Triage"],
  },
  {
    id: "death-of-a-friend", roll: 6,
    title: "Death of a Friend",
    summary: "Eine befreundete Person kam im Einsatz ums Leben.",
    attribute: "insight", department: "medicine",
    focusSuggestions: ["Counseling or a pursuit honoring the fallen friend"],
  },
  {
    id: "discovered-an-artifact", roll: 7,
    title: "Discovered an Artifact",
    summary: "Du hast ein Artefakt oder ein technisches Relikt einer untergegangenen Zivilisation entdeckt.",
    attribute: "reason", department: "engineering",
    focusSuggestions: ["Ancient Technology", "Computers", "Reverse Engineering"],
  },
  {
    id: "encountered-a-truly-alien-being", roll: 8,
    title: "Encountered a Truly Alien Being",
    summary: "Du bist einer Lebensform begegnet, die sich jeder vertrauten Vorstellung von Leben entzog.",
    attribute: "reason", department: "science",
    focusSuggestions: ["Empathy", "Philosophy", "Xenobiology"],
  },
  {
    id: "first-contact", roll: 9,
    title: "First Contact",
    summary: "Du warst an der ersten Begegnung mit einer bislang unbekannten Kultur beteiligt.",
    attribute: "presence", department: "any",
    focusSuggestions: ["Cultural Studies", "Diplomacy", "Infiltration"],
  },
  {
    id: "lauded-by-another-culture", roll: 10,
    title: "Lauded by Another Culture",
    summary: "Eine Mission brachte dir Anerkennung und Ansehen bei einer anderen Kultur ein.",
    attribute: "presence", department: "science",
    focusSuggestions: ["A focus reflecting the culture or its techniques"],
    optionalTrait: "Friend to the X",
  },
  {
    id: "learned-unique-language", roll: 11,
    title: "Learned Unique Language",
    summary: "Du hast eine ungewöhnliche Kommunikationsform erlernt.",
    attribute: "insight", department: "science",
    focusSuggestions: ["Linguistics", "Cultural Studies", "Negotiations"],
  },
  {
    id: "mentored", roll: 12,
    title: "Mentored",
    summary: "Eine erfahrene, angesehene Person nahm dich unter ihre Fittiche.",
    attribute: "any", department: "conn",
    focusSuggestions: ["Composure", "Etiquette", "A focus reflecting the mentor's specialties"],
  },
  {
    id: "negotiated-a-treaty", roll: 13,
    title: "Negotiated a Treaty",
    summary: "Du hast an Verhandlungen zu einem Vertrag, Abkommen oder Bündnis mitgewirkt.",
    attribute: "control", department: "command",
    focusSuggestions: ["Diplomacy", "Negotiation", "Galactic Politics"],
  },
  {
    id: "new-battle-strategy", roll: 14,
    title: "New Battle Strategy",
    summary: "Du hast im Konflikt mit einer feindlichen Macht eine neue Taktik entwickelt.",
    attribute: "daring", department: "security",
    focusSuggestions: ["Combat Tactics", "Hazard Awareness"],
  },
  {
    id: "required-to-take-command", roll: 15,
    title: "Required to Take Command",
    summary: "Als die Führung ausfiel, musstest du in einer Krise das Kommando übernehmen.",
    attribute: "daring", department: "command",
    focusSuggestions: ["Inspiration", "Composure"],
  },
  {
    id: "serious-injury", roll: 16,
    title: "Serious Injury",
    summary: "Eine schwere Verletzung zwang dich zu einer längeren Genesungsphase.",
    attribute: "fitness", department: "medicine",
    focusSuggestions: ["A focus related to the injury, recovery, or a new pursuit"],
    optionalTrait: "A lasting effect of the injury or recovery, such as an implant or disability",
  },
  {
    id: "ship-destroyed", roll: 17,
    title: "Ship Destroyed",
    summary: "Das Schiff, auf dem du dientest, wurde zerstört; du gehörtest zu den Überlebenden.",
    attribute: "daring", department: "security",
    focusSuggestions: ["Extra-Vehicular Operations", "Small Craft", "Survival"],
  },
  {
    id: "solved-an-engineering-crisis", roll: 18,
    title: "Solved an Engineering Crisis",
    summary: "Du hast mit einer technischen Lösung eine Krise beendet und Leben gerettet.",
    attribute: "control", department: "engineering",
    focusSuggestions: ["Electro-Plasma Power Systems", "Fusion Reactors", "Warp Engines"],
  },
  {
    id: "special-commendation", roll: 19,
    title: "Special Commendation",
    summary: "Du hast Kolleginnen und Kollegen in einer Krise gerettet und wurdest dafür ausgezeichnet.",
    attribute: "fitness", department: "any",
    focusSuggestions: ["Athletics", "Survival", "Emergency Medicine"],
  },
  {
    id: "transporter-accident", roll: 20,
    title: "Transporter Accident",
    summary: "Ein ungewöhnlicher Unfall beim Transportieren hatte bleibende Folgen.",
    attribute: "control", department: "conn",
    focusSuggestions: ["Transporters & Replicators", "Small Craft", "Quantum Mechanics"],
  },
] as const;

const EVENT_BY_ID = new Map(STA2E_CAREER_EVENTS.map((event) => [event.id, event]));
const EVENT_BY_TITLE = new Map(
  STA2E_CAREER_EVENTS.map((event) => [event.title.toLowerCase(), event]),
);

export function careerEventByIdOrTitle(value: string): Sta2eCareerEvent | null {
  return EVENT_BY_ID.get(value) ?? EVENT_BY_TITLE.get(value.trim().toLowerCase()) ?? null;
}

export function normalizeCareerEventEntry(value: string): string {
  return careerEventByIdOrTitle(value)?.id ?? value;
}

export function careerEventTitle(value: string): string {
  return careerEventByIdOrTitle(value)?.title ?? value;
}

export function rollCareerEvent(random = Math.random): Sta2eCareerEvent {
  const roll = Math.floor(random() * 20) + 1;
  return STA2E_CAREER_EVENTS[roll - 1];
}

// Vorlagen für den Datenbank-Assistenten (/rag).
//
// Der RAG-Stack kann deutlich mehr, als die meisten Leute spontan fragen —
// ein leeres Eingabefeld mit „Frage an die Datenbank…" verrät nicht, dass man
// eine Rückschau über mehrere Einsatzberichte oder eine Wissensabfrage aus
// Sicht einer Figur bekommen kann. Diese Vorlagen sind der Einstieg dafür.
//
// Bewusst reine Daten + Textfunktionen (kein React, keine DB): so sind sie
// unit-testbar und lassen sich später auch anderswo einsetzen (z.B. im
// Onboarding).
//
// Der Platzhalter {} markiert die Stelle, die die fragende Person selbst
// ausfüllt; beim Einsetzen ins Eingabefeld springt der Cursor genau dorthin.

export const PROMPT_PLACEHOLDER = "{}";

export interface RagPromptTemplate {
  id: string;
  // Knopfbeschriftung — kurz, damit die Leiste nicht umbricht.
  label: string;
  // Was die Vorlage tut; erscheint als title-Attribut.
  hint: string;
  template: string;
}

export const RAG_PROMPTS: RagPromptTemplate[] = [
  {
    id: "recap",
    label: "Was bisher geschah",
    hint: "Rückschau über die jüngsten Einsatzberichte",
    template:
      "Fasse zusammen, was in den jüngsten Einsatzberichten passiert ist: die wichtigsten Ereignisse in zeitlicher Reihenfolge, wer beteiligt war und was offen geblieben ist.",
  },
  {
    id: "mission",
    label: "Mission zusammenfassen",
    hint: "Verlauf einer bestimmten Mission",
    template:
      "Fasse den Verlauf der Mission „{}“ zusammen: Auftrag, Beteiligte, wichtige Wendungen und Ausgang.",
  },
  {
    id: "topic",
    label: "Was wissen wir über …",
    hint: "Alles, was die Datenbank zu einem Stichwort hergibt",
    template:
      "Was wissen wir über {}? Fasse zusammen, was in der Datenbank dazu steht, und nenne die Quellen.",
  },
  {
    id: "person",
    label: "Wer ist …",
    hint: "Kurzprofil einer Person oder Fraktion",
    template:
      "Wer ist {}? Nenne Rolle, Zugehörigkeit und die wichtigsten Auftritte.",
  },
  {
    id: "relations",
    label: "Beziehungen einer Figur",
    hint: "Mit wem eine Figur zu tun hatte",
    template:
      "Mit wem hatte {} zu tun? Nenne Personen, Fraktionen und Orte samt Zusammenhang.",
  },
];

// Braucht die Vorlage noch eine Eingabe?
export function promptNeedsInput(t: RagPromptTemplate): boolean {
  return t.template.includes(PROMPT_PLACEHOLDER);
}

// Vorlage mit eingesetztem Wert. Ohne Wert wird der Platzhalter entfernt —
// das ist der Text, der beim Anklicken im Eingabefeld landet.
export function fillPrompt(t: RagPromptTemplate, value = ""): string {
  return t.template.replace(PROMPT_PLACEHOLDER, value);
}

// Zeichenposition, an die der Cursor nach dem Einsetzen gehört (dort steht der
// Platzhalter). null, wenn die Vorlage keine Eingabe braucht.
export function promptCaret(t: RagPromptTemplate): number | null {
  const i = t.template.indexOf(PROMPT_PLACEHOLDER);
  return i === -1 ? null : i;
}

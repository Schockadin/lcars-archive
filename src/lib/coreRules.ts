// Kernregeln für den Spieltisch: Momentum, Bedrohung und Entschlossenheit —
// übersetzt aus dem Regeltext der Runde (STA2, Character Creation & Play).
//
// Bewusst als DATEN statt als fertiges JSX: dieselbe Liste wird zweimal
// gerendert — als Blatt 2 der Bogen-Vorschau (CharacterSheetPreview) und im
// PDF-Export (CharacterSheetPdfDocument), die kein gemeinsames Markup teilen
// können (react-pdf kennt kein <p>). Ohne "server-only", damit beide
// Aufrufer sie nutzen können.
//
// Anders als Talente und Schwerpunkte hängen diese Regeln an keinem Charakter
// und stehen deshalb nicht in der Datenbank: sie gelten für die ganze Runde
// und ändern sich nur mit dem Regelwerk selbst.

export interface CoreRuleItem {
  // Der Begriff, wie er am Tisch fällt (englisch) — die Erklärung ist
  // deutsch, wie überall auf dem Bogen.
  term: string;
  // Preis in Momentum bzw. Bedrohung, soweit es einen festen gibt.
  cost?: string;
  text: string;
}

export interface CoreRuleSection {
  title: string;
  original: string;
  // Einleitender Satz über den Punkten, soweit einer nötig ist.
  intro?: string;
  items: CoreRuleItem[];
}

export const CORE_RULES: CoreRuleSection[] = [
  {
    title: "Momentum ausgeben",
    original: "Spending Momentum",
    intro:
      "Aus dem eigenen Wurf, aus dem Gruppenvorrat oder gegen Bedrohung erkauft.",
    items: [
      {
        term: "Create Advantage",
        cost: "2 Momentum",
        text: "Einen zusätzlichen Vorteil schaffen — ein positives Merkmal in der Szene.",
      },
      {
        term: "Create Opportunity",
        cost: "je Würfel",
        text: "Zusätzliche W20 kaufen. Das geht nur VOR dem Wurf.",
      },
      {
        term: "Create Problem",
        cost: "2 Momentum",
        text: "Die Schwierigkeit einer gegnerischen Aufgabe um 1 erhöhen.",
      },
      {
        term: "Obtain Information",
        cost: "1 Momentum",
        text: "Der Spielleitung eine einzelne Frage zur Situation stellen.",
      },
    ],
  },
  {
    title: "Momentum aufheben",
    original: "Saving Momentum",
    items: [
      {
        term: "Gruppenvorrat",
        text: "Übriges Momentum wandert in den Gruppenvorrat — höchstens 6 Punkte.",
      },
    ],
  },
  {
    title: "Bedrohung ausgeben",
    original: "Spending Threat",
    intro: "Die Spielleitung nutzt Bedrohung wie die Gruppe ihr Momentum.",
    items: [
      {
        term: "NPC Momentum",
        text: "Bedrohung wirkt für NSC wie der Gruppenvorrat für die Spielenden.",
      },
      {
        term: "Complication",
        cost: "2 Bedrohung",
        text: "Eine zusätzliche Komplikation für die Gruppe schaffen.",
      },
      {
        term: "Reinforcements",
        cost: "1–2 Bedrohung",
        text: "Verstärkung: 1 für einfache NSC, 2 für bedeutende NSC; ein Raumschiff kostet Bedrohung in Höhe seiner Größe (Scale).",
      },
      {
        term: "Environmental Effects",
        text: "Umgebungseffekte auslösen oder verschärfen.",
      },
    ],
  },
  {
    title: "Entschlossenheit",
    original: "Determination",
    intro:
      "Jede Sitzung beginnt mit 1 Punkt, höchstens 3 lassen sich halten. Ausgeben darf man nur, wenn einer der eigenen Werte (Values) in dieser Aufgabe hilft.",
    items: [
      {
        term: "Perfect Opportunity",
        text: "Einen zusätzlichen W20 einlegen, der bereits eine 1 zeigt — nur unter passenden Umständen.",
      },
      {
        term: "Moment of Inspiration",
        text: "Alle eigenen Würfel dieses Wurfs neu werfen.",
      },
      {
        term: "Surge of Activity",
        text: "Sofort nach der ersten eine weitere Aufgabe ausführen.",
      },
      {
        term: "Make it So",
        text: "Einen Vorteil schaffen und ihn auf die Szene anwenden.",
      },
      {
        term: "Punkt dazubekommen",
        text: "Behindert dich einer deiner Werte, bietet die Spielleitung einen Punkt Entschlossenheit an — im Tausch gegen eine Komplikation.",
      },
      {
        term: "Challenge a Value",
        text: "Einmal je Sitzung: Wirkt sich ein Wert negativ aus, darfst du ihn streichen und bekommst einen Punkt Entschlossenheit (er ist erschüttert). Diesen Punkt darfst du für den Rest der Mission nicht mehr einsetzen.",
      },
    ],
  },
];

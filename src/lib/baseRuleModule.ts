import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";

export const BASE_RULE_MODULE_ID = "sta2e";

/** The editable, campaign-wide baseline shown for every STA 2e character. */
export const BASE_RULE_MODULE: RuleModuleDefinition = {
  id: BASE_RULE_MODULE_ID,
  name: "STA 2e · Basismodul",
  summary:
    "Gemeinsame Referenz für Charakterwerte, Proben und die zentralen Spielabläufe der Kampagne.",
  characterRoles: ["*"],
  rules: [
    {
      id: "attributes-and-disciplines",
      title: "Attribute und Disziplinen",
      body:
        "Der Charakterbogen führt die sechs Attribute Kontrolle, Wagemut, Fitness, Einsicht, Präsenz und Verstand sowie die sechs Disziplinen Kommando, Steuerung, Technik, Sicherheit, Medizin und Wissenschaft. Ihre Kombination bildet die Grundlage für Aufgaben.",
    },
    {
      id: "task-resolution",
      title: "Aufgaben und Proben",
      body:
        "Für eine Aufgabe legt die Spielleitung passende Werte und Schwierigkeit fest. Der Würfelpool und die benötigte Zahl an Erfolgen richten sich nach dem STA-2e-Regelwerk; Foki, Merkmale und die Situation können das Ergebnis beeinflussen.",
    },
    {
      id: "values-focuses-talents",
      title: "Werte, Schwerpunkte und Talente",
      body:
        "Werte beschreiben Überzeugungen, die im Spiel aufgegriffen werden können. Schwerpunkte bilden besondere Erfahrung ab; Talente geben die jeweils beschriebene Spezialisierung oder Fähigkeit. Der Charakterbogen dokumentiert die Auswahl und ihre Voraussetzungen.",
    },
    {
      id: "stress-and-determination",
      title: "Stress und Entschlossenheit",
      body:
        "Stress, Schutz und Entschlossenheit werden auf dem Charakterbogen getrennt geführt. Das Stressmaximum ergibt sich aus Fitness und eingetragenen Talentboni; Entschlossenheit wird als eigener Wert verwaltet.",
    },
    {
      id: "advancement",
      title: "Erschaffung und Steigerung",
      body:
        "Die Kampagne verwendet die unter „Steigerungsregeln“ gepflegten AP-Kosten, Erschaffungsbudgets und Vergaben. Die Spielleitung kann diese Vorgaben für die Runde anpassen; die jeweils aktiven Werte stehen unter „Regeln“ → „Steigerungsregeln“.",
    },
  ],
  resources: [],
  statuses: [],
  talents: [],
  prestigeClasses: [],
  collections: [],
  schools: [],
  spells: [],
};

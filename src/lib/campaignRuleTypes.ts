// Konstanten, Typen und Validierung für die eigenen Regeln der Runde —
// bewusst OHNE "server-only", damit die Bogen-Vorschau (Client-Komponente),
// die Server-Actions von /gm/rules und die Tests dieselben Prüfungen nutzen.
// Der DB-Zugriff liegt in campaignRules.ts, das von hier re-exportiert
// (dieselbe Aufteilung wie focusCatalog.ts/focuses.ts).

export const RULE_NAME_MAX = 120;
export const RULE_BODY_MAX = 4000;

export interface CampaignRule {
  id: number;
  name: string;
  body: string;
  // Reihenfolge auf dem Spickzettel; bei Gleichstand entscheidet der Name.
  sortOrder: number;
}

export interface CampaignRuleInput {
  name: string;
  body: string;
  sortOrder: number;
}

export type CampaignRuleValidation =
  | { ok: true; value: CampaignRuleInput }
  | { ok: false; error: string };

export function validateCampaignRuleInput(raw: {
  name: string;
  body: string;
  sortOrder: string;
}): CampaignRuleValidation {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Bitte einen Namen angeben." };
  if (name.length > RULE_NAME_MAX) {
    return { ok: false, error: `Name zu lang (max. ${RULE_NAME_MAX} Zeichen).` };
  }

  const body = raw.body.trim();
  if (!body) return { ok: false, error: "Bitte einen Regeltext angeben." };
  if (body.length > RULE_BODY_MAX) {
    return {
      ok: false,
      error: `Regeltext zu lang (max. ${RULE_BODY_MAX} Zeichen).`,
    };
  }

  // Leeres Feld = 0 (ans Ende der Nullen, danach alphabetisch). Eine kaputte
  // Zahl ist ein Eingabefehler und wird gemeldet, statt still zu 0 zu werden.
  const rawOrder = raw.sortOrder.trim();
  const sortOrder = rawOrder === "" ? 0 : Number(rawOrder);
  if (!Number.isInteger(sortOrder)) {
    return { ok: false, error: "Die Reihenfolge muss eine ganze Zahl sein." };
  }

  return { ok: true, value: { name, body, sortOrder } };
}

// Reihenfolge auf dem Spickzettel: erst sort_order, dann alphabetisch —
// sprachbewusst über localeCompare mit „de", wie byTalentOrder/byFocusOrder.
export function byRuleOrder(a: CampaignRule, b: CampaignRule): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, "de");
}

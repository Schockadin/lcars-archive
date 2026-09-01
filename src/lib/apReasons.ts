// Buchungsgründe und Kontotypen des AP-Kontos — die DB-freie Hälfte von
// src/lib/characterAp.ts. Bewusst OHNE "server-only" und ohne Import von
// @/lib/db: Client-Komponenten (Charakterbogen, AP-Vergabe, AP-Journal)
// brauchen die Labels, dürfen aber die Datenschicht nicht mitziehen — sonst
// landet der Postgres-Treiber im Browser-Bundle.
// Buchungen des AP-Kontos (siehe character_ap_entries in scripts/schema.sql).
// Der Kontostand ist immer die Summe der Buchungen — es gibt bewusst kein
// zusätzliches Saldo-Feld, das mit dem Journal auseinanderlaufen könnte.
export const AP_REASONS = [
  "session", // Es wurde eine Session gespielt (+1)
  "logbook", // Es wurde ein Logbuch zur Session geschrieben (+1)
  "bonus", // Bonus-AP einer Session (siehe /gm/sessions)
  "mission", // Abschluss einer Mission / eines Story-Arcs (+X)
  "manual", // Freie Korrektur durch die Spielleitung
  "advancement", // Ausgabe beim Steigern (negativ)
] as const;

export type ApReason = (typeof AP_REASONS)[number];

export const AP_REASON_LABELS: Record<ApReason, string> = {
  session: "Session gespielt",
  logbook: "Logbuch geschrieben",
  bonus: "Bonus",
  mission: "Mission / Story-Arc abgeschlossen",
  manual: "Korrektur",
  advancement: "Steigerung",
};

export function isApReason(value: string): value is ApReason {
  return (AP_REASONS as readonly string[]).includes(value);
}

export interface ApEntry {
  id: number;
  amount: number;
  reason: ApReason;
  note: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface ApAccount {
  earned: number;
  spent: number;
  available: number;
  entries: ApEntry[];
}

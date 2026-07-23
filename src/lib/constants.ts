/**
 * Zentrale Konstanten für das Neo Archiv.
 */

/** Jahr, in dem die Pen-&-Paper-Kampagne gestartet ist. */
export const CAMPAIGN_START_YEAR = 2011;

/** Anzahl der Jahre, die die Kampagne bis heute (gerechnet) läuft. */
export function getCampaignYears(): number {
  return new Date().getFullYear() - CAMPAIGN_START_YEAR;
}

export const BUTTON_CLASSNAMES =
  "lcars-pill-btn--outline self-start cursor-pointer disabled:opacity-50 gap-[8px]";

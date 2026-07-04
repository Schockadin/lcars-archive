/**
 * Zentrale Konstanten für das Neo Archiv.
 */

/** Jahr, in dem die Pen-&-Paper-Kampagne gestartet ist. */
export const CAMPAIGN_START_YEAR = 2011;

/** Anzahl der Jahre, die die Kampagne bis heute (gerechnet) läuft. */
export function getCampaignYears(): number {
  return new Date().getFullYear() - CAMPAIGN_START_YEAR;
}

// Für die Versions-Anzeige
export const VERSION_PREFIX = "0";
export const FIRST_PR_NUMBER = 0;
export const FIRST_COMMIT_NUMBER = 0;

// Die private Notiz eines Vault-Texts gehört in keinen öffentlichen Lesepfad.
// Rein und ohne Renderer-Abhängigkeiten, damit Export, Suche und Index dieselbe
// Grenze verwenden wie die HTML-Ansicht.
export function splitPrivate(markdown: string): string {
  return markdown.split("<!-- private -->")[0].trim();
}

// Ältere Indexeinträge können noch private Notizen enthalten. Sie bleiben bis
// zum erneuten Embedden gesperrt, auch wenn ihre denormalisierten ACLs passen.
export const PUBLIC_CONTENT_INDEX_VERSION = 1;

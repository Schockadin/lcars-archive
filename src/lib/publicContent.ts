// Die private Notiz eines Vault-Texts gehört in keinen öffentlichen Lesepfad.
// Rein und ohne Renderer-Abhängigkeiten, damit Export, Suche und Index dieselbe
// Grenze verwenden wie die HTML-Ansicht.
export function splitPrivate(markdown: string): string {
  return markdown.split("<!-- private -->")[0].trim();
}

// Älteres HTML kann Vorschauen enthalten, die vor der Trennung privater
// Notizen gespeichert wurden. Nie unverändert in einen öffentlichen DTO
// übernehmen; die Leseseite kann aktuelle, sichere Vorschauen nachladen.
export function stripStoredContentLinkPreviews(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    if (!/\sdata-preview\s*=/i.test(tag)) return tag;
    return tag.replace(
      /\s(?:data-preview|title)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      "",
    );
  });
}

// Ältere Indexeinträge können noch private Notizen enthalten. Sie bleiben bis
// zum erneuten Embedden gesperrt, auch wenn ihre denormalisierten ACLs passen.
export const PUBLIC_CONTENT_INDEX_VERSION = 1;

// Reine (DB-/server-freie) Helfer für den öffentlichen R2-Asset-Bucket, in dem
// hochgeladene Assets liegen — Content-Bilder, Charakter-Portraits und
// Charakterbögen (PDFs). Bewusst getrennt vom Backup-Bucket (R2_BUCKET_NAME,
// src/lib/r2Backup.ts): der Asset-Bucket ist öffentlich (eigene Domain/Public-
// URL, R2_ASSET_PUBLIC_BASE_URL), Assets werden per direkter URL ausgeliefert
// statt über den App-Proxy. Diese Datei enthält nur die reine URL-/Key-/
// Validierungslogik (testbar unter der Haupt-Vitest-Config, kein "server-only"),
// die R2-Zugriffe selbst liegen in r2Backup.ts.

export class InvalidAssetError extends Error {}

// Erlaubte Bildtypen für Portraits/Content-Bilder — der Key trägt die aus dem
// MIME-Type abgeleitete (nicht die vom Client fälschbare) Endung.
export const ASSET_IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const MAX_ASSET_IMAGE_BYTES = 5 * 1024 * 1024;

// Charakterbögen: nur PDF, großzügigeres Limit als bei Bildern (mehrseitige
// Bögen mit eingebetteten Grafiken werden schnell größer).
export const CHARACTER_SHEET_MIME = "application/pdf";
export const MAX_CHARACTER_SHEET_BYTES = 20 * 1024 * 1024;

// Baut die öffentliche Auslieferungs-URL eines Objekts aus der konfigurierten
// Basis-URL (z.B. https://assets.neo-archiv.de oder die r2.dev-URL) und dem
// Objekt-Key. Trailing Slash der Basis und führende Slashes des Keys werden
// normalisiert, damit genau ein Trennzeichen entsteht.
export function buildAssetPublicUrl(baseUrl: string, key: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${trimmedBase}/${cleanKey}`;
}

// Prüft eine Bild-Datei (Portrait/Content-Bild) und liefert die zum MIME-Type
// gehörende Dateiendung. Wirft InvalidAssetError bei unbekanntem Typ, leerer
// oder zu großer Datei — gemeinsame Vorprüfung für alle Bild-Uploads in den
// Asset-Bucket.
export function assertImageAsset(mimeType: string, sizeBytes: number): string {
  const extension = ASSET_IMAGE_MIME_TO_EXT[mimeType];
  if (!extension) {
    throw new InvalidAssetError(`Nicht unterstützter Bildtyp: "${mimeType}"`);
  }
  if (sizeBytes === 0) {
    throw new InvalidAssetError("Die Datei ist leer.");
  }
  if (sizeBytes > MAX_ASSET_IMAGE_BYTES) {
    throw new InvalidAssetError(
      `Die Datei ist zu groß (max. ${MAX_ASSET_IMAGE_BYTES / (1024 * 1024)} MB).`,
    );
  }
  return extension;
}

// Prüft eine Charakterbogen-Datei (PDF). Wirft InvalidAssetError bei falschem
// Typ, leerer oder zu großer Datei.
export function assertCharacterSheetAsset(
  mimeType: string,
  sizeBytes: number,
): void {
  if (mimeType !== CHARACTER_SHEET_MIME) {
    throw new InvalidAssetError("Nur PDF-Dateien sind als Charakterbogen erlaubt.");
  }
  if (sizeBytes === 0) {
    throw new InvalidAssetError("Die Datei ist leer.");
  }
  if (sizeBytes > MAX_CHARACTER_SHEET_BYTES) {
    throw new InvalidAssetError(
      `Die Datei ist zu groß (max. ${MAX_CHARACTER_SHEET_BYTES / (1024 * 1024)} MB).`,
    );
  }
}

// Kürzt/normalisiert einen vom Client mitgeschickten Dateinamen für die
// Anzeige (Charakterbögen behalten ihren Originalnamen als Label). Entfernt
// Pfadanteile und Steuerzeichen und begrenzt die Länge; nie als Objekt-Key
// oder Identifier verwendet (der Key wird serverseitig aus einer UUID gebaut).
export function sanitizeFileName(name: string, fallback = "datei.pdf"): string {
  const base = name.split(/[\\/]/).pop()?.trim() ?? "";
  const cleaned = Array.from(base)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join("")
    .slice(0, 200);
  return cleaned || fallback;
}

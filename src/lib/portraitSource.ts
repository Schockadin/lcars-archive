// Woher ein gespeichertes Portrait stammt.
//
// Ein Portrait wird nur noch als Datei hochgeladen (siehe PortraitPicker.tsx
// und characterHead.ts). In der Datenbank stehen aber noch Werte aus der Zeit
// davor: von Hand eingetragene fremde Adressen und eingebettete Data-URLs aus
// dem Vault-Import. Diese Einteilung sagt, was davon abgelöst werden muss —
// benutzt vom Wartungslauf (scripts/import-portrait-links.ts) und vom
// Markdown-Import, der eine Adresse aus dem Frontmatter beim Import gleich
// hochlädt.
//
// Bewusst OHNE "server-only" und ohne Buffer: reine Zeichenketten-Logik, damit
// sie unter der Haupt-Vitest-Config testbar bleibt.

export type PortraitKind =
  // Kein Portrait hinterlegt.
  | "empty"
  // Liegt bereits im eigenen Asset-Bucket — nichts zu tun.
  | "upload"
  // Wird von der App selbst ausgeliefert (/api/content-images/…): auch das ist
  // ein Upload, nur über den Proxy adressiert. Ein zweites Mal hochladen würde
  // dasselbe Bild verdoppeln.
  | "internal"
  // Base64 im Datensatz (data:image/…). Blockiert jede Zeile und lässt sich
  // nicht zuschneiden.
  | "data"
  // Adresse auf einem fremden Server.
  | "external";

// Der Präfix, unter dem hochgeladene Portraits im Asset-Bucket liegen (siehe
// characterAssets.ts). Hier als Konstante, weil die Einteilung ihn braucht und
// characterAssets.ts "server-only" ist.
export const PORTRAIT_KEY_PREFIX = "character-portraits/";

export function portraitKind(
  value: string | null | undefined,
  assetBaseUrl: string | null | undefined,
): PortraitKind {
  const url = (value ?? "").trim();
  if (!url) return "empty";
  if (url.startsWith("data:")) return "data";
  if (url.startsWith("/")) return "internal";

  if (assetBaseUrl) {
    const base = assetBaseUrl.replace(/\/+$/, "");
    if (url.startsWith(`${base}/${PORTRAIT_KEY_PREFIX}`)) return "upload";
  }
  return "external";
}

// Ob dieses Portrait abgelöst werden muss — genau die beiden Fälle, in denen
// das Bild nicht im eigenen Bucket liegt.
export function needsPortraitImport(
  value: string | null | undefined,
  assetBaseUrl: string | null | undefined,
): boolean {
  const kind = portraitKind(value, assetBaseUrl);
  return kind === "data" || kind === "external";
}

// Eine Data-URL in ihre Bestandteile zerlegen. Nur Bilder werden angenommen;
// welche genau, entscheidet weiterhin assertImageAsset beim Hochladen.
//
// Liefert die Base64-Nutzlast als Zeichenkette statt als Buffer, damit dieses
// Modul ohne Node-Globals auskommt.
export function parseImageDataUrl(
  value: string,
): { mimeType: string; base64: string } | null {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(
    value.trim(),
  );
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  if (!mimeType.startsWith("image/")) return null;
  return match[2] ? { mimeType, base64: match[2] } : null;
}

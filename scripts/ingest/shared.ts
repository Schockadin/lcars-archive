// scripts/ingest/shared.ts

// markdownToHtml lebt jetzt in src/lib/markdown.ts (auch im App-Code nutzbar)
// und wird hier re-exportiert, damit die Ingest-Skripte weiter aus "./shared.js"
// importieren können. Relativer .js-Pfad (kein @/-Alias) wegen tsx-Auflösung.
export { markdownToHtml } from "../../src/lib/markdown.js";

// Slugs validieren – muss URL-sicher sein
export function validateSlug(slug: unknown, file: string): string {
  if (typeof slug !== "string" || slug.trim() === "") {
    throw new Error(`Kein slug in ${file}`);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(
      `Ungültiger slug "${slug}" in ${file} – nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt`,
    );
  }
  return slug.trim();
}

// ISO-Datum validieren oder null zurückgeben
export function parseDate(value: unknown): string | null {
  if (!value) return null;

  // gray-matter parsed YYYY-MM-DD automatisch als Date-Objekt
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const str = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error(
      `Ungültiges Datumsformat "${str}" – erwartet wird YYYY-MM-DD`,
    );
  }
  return str;
}

export function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

export function toNumberArray(value: unknown): number[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

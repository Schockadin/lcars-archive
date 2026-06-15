import { remark } from 'remark';
import remarkHtml from 'remark-html';

// Markdown bis zum private-Kommentar kürzen und zu HTML konvertieren
export async function markdownToHtml(markdown: string): Promise<string> {
  const publicContent = markdown.split('<!-- private -->')[0].trim();

  const result = await remark()
    .use(remarkHtml, { sanitize: false })
    .process(publicContent);

  return result.toString();
}

// Slugs validieren – muss URL-sicher sein
export function validateSlug(slug: unknown, file: string): string {
  if (typeof slug !== 'string' || slug.trim() === '') {
    throw new Error(`Kein slug in ${file}`);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(
      `Ungültiger slug "${slug}" in ${file} – nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt`
    );
  }
  return slug.trim();
}

// ISO-Datum validieren oder null zurückgeben
export function parseDate(value: unknown): string | null {
  if (!value) return null;

  // gray-matter parsed YYYY-MM-DD automatisch als Date-Objekt
  if (value instanceof Date) {
    // UTC verwenden, sonst verschiebt sich das Datum durch Zeitzonen
    const year  = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback: String direkt validieren
  const str = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error(
      `Ungültiges Datumsformat "${str}" – erwartet wird YYYY-MM-DD`
    );
  }
  return str;
}

// Sicherstellen dass ein Wert ein String-Array ist
export function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return [value];
  return [];
}
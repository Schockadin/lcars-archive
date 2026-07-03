// Reine Slug-Erzeugung aus einem Freitext-Titel (z.B. Dialog-Titel). Muss
// dieselbe Zeichenmenge erzeugen, die scripts/ingest/shared.ts#validateSlug
// akzeptiert (/^[a-z0-9-]+$/) — sonst würde ein späterer Ingest-Lauf einen
// hier erzeugten Slug als "ungültig" ablehnen, sollte er je in den Vault
// zurückexportiert werden.
const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
};

export function slugifyBase(title: string): string {
  const replaced = title.replace(/[äöüßÄÖÜ]/g, (c) => UMLAUT_MAP[c] ?? c);
  const slug = replaced
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "gespraech";
}

// Gemeinsame FormData-Parsing-Helfer für die Content-Actions (Charaktere,
// Missionen, Mission-Logs, Archiv-Einträge, Dialoge) — komma-getrennte Felder
// wie tags/aliases/species/factions/ships werden überall gleich behandelt:
// aufsplitten, trimmen, leere Werte raus, Duplikate raus.
export function parseList(value: FormDataEntryValue | null): string[] {
  return [
    ...new Set(
      String(value ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

export function parseNumberList(value: FormDataEntryValue | null): number[] {
  return parseList(value)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
}

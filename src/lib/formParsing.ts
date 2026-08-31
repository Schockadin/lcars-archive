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

// Zeilenweise Listen (ein Eintrag je Zeile) statt kommagetrennt — für die
// mehrzeiligen Kästen des Charakterbogens (Werte, Talente, Angriffe, …), deren
// Einträge selbst Kommata enthalten dürfen ("RayGun: Deadly/Stun 4, 1H").
// Duplikate bleiben hier bewusst erhalten: zwei gleichnamige Einträge (z.B.
// dieselbe Waffe zweimal) sind auf einem Charakterbogen zulässig.
export function parseLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parseNumberList(value: FormDataEntryValue | null): number[] {
  return parseList(value)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
}

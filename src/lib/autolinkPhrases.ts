// Ableitung einfacher deutscher Genitivformen für Alias-Namen. Bei Namen,
// die auf s-Laut enden, steht im Genitiv üblicherweise nur ein Apostroph.
export function aliasGenitive(alias: string): string | null {
  const value = alias.trim();
  if (!value || /[’']$/.test(value)) return null;
  if (/[sxzß]$/i.test(value)) return `${value}’`;
  return `${value}s`;
}

export function aliasGenitives(aliases: string[]): string[] {
  const seen = new Set(
    aliases.map((alias) => alias.trim().toLocaleLowerCase("de-DE")),
  );
  const forms: string[] = [];
  for (const alias of aliases) {
    const form = aliasGenitive(alias);
    if (!form) continue;
    const variants = /[sxzß]$/i.test(alias.trim())
      ? [form, `${alias.trim()}'`]
      : [form];
    for (const variant of variants) {
      const key = variant.toLocaleLowerCase("de-DE");
      if (seen.has(key)) continue;
      seen.add(key);
      forms.push(variant);
    }
  }
  return forms;
}

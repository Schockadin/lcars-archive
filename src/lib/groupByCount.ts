// Gruppiert Einträge nach einem Schlüssel und zählt Duplikate — gemeinsame
// Logik hinter AutolinkButton.tsx' distinctMatches und
// RemoveWikilinksButton.tsx' distinctRemoved (beide bauten dieselbe
// Reduce-in-Record-dann-Object.values-Group-by-Count-Logik einzeln nach).
export function groupByCount<T, R extends object>(
  items: T[],
  keyFn: (item: T) => string,
  mapFn: (item: T) => R,
): (R & { count: number })[] {
  const byKey: Record<string, R & { count: number }> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!byKey[key]) {
      byKey[key] = { ...mapFn(item), count: 0 };
    }
    byKey[key].count++;
  }
  return Object.values(byKey);
}

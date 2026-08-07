// Gemeinsame „liegt Position/Bereich in einem geschützten Abschnitt?"-Prüfung
// für die drei Textwerkzeuge, die vor dem Ersetzen bestimmte Abschnitte
// (Codeblöcke, Inline-Code, Bilder, bestehende Links/Wikilinks) aussparen:
// applyGermanTypography (typography.ts), applyAutolinks (autolink.ts) und
// stripWikilinks (wikilinkCleanup.ts). Alle drei sammelten die geschützten
// Bereiche per globalem RegExp und prüften danach mit protectedRanges.some(…)
// — also pro geprüfter Position linear über ALLE Bereiche (O(n·m) je Dokument).
//
// Da ein globaler RegExp-Durchlauf die Treffer immer links→rechts und ohne
// Überlappung liefert, sind die Bereiche bereits AUFSTEIGEND nach start UND
// (weil nicht überlappend) nach end sortiert. Das erlaubt eine Binärsuche
// (O(log m) statt O(m) je Prüfung). Rein, ohne DB/React — unit-testbar.

// Halb-offener Bereich [start, end).
export type ProtectedRange = [start: number, end: number];

// Überlappt [start, end) irgendeinen der (aufsteigend sortierten, nicht
// überlappenden) Bereiche? Ein Bereich überlappt genau dann, wenn er
// end > start UND start < end erfüllt. Enden sind ebenfalls aufsteigend,
// also ist der erste Bereich mit end > start der einzige Kandidat mit dem
// kleinsten start in dieser Teilmenge — liegt dessen start < end, überlappt er.
export function isRangeProtected(
  ranges: readonly ProtectedRange[],
  start: number,
  end: number,
): boolean {
  if (end <= start) return false; // leerer Bereich schützt nichts
  let lo = 0;
  let hi = ranges.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ranges[mid][1] > start) hi = mid;
    else lo = mid + 1;
  }
  return lo < ranges.length && ranges[lo][0] < end;
}

// Liegt der einzelne Index innerhalb eines geschützten Bereichs? Entspricht
// der Überlappung des Einzelzeichens [index, index + 1).
export function isIndexProtected(
  ranges: readonly ProtectedRange[],
  index: number,
): boolean {
  return isRangeProtected(ranges, index, index + 1);
}

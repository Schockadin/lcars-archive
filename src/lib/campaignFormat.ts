// React-/DB-freie Kampagnen-Helfer — importierbar aus Client-Komponenten und
// Tests (anders als campaign.ts, das "server-only" ist, weil es die DB
// anspricht). Gleiches Muster wie archiveFormat.ts vs. archive.ts.

// Leitet aus einem Geburtsdatum (ISO YYYY-MM-DD) und dem aktuellen
// Ingame-Jahr das Alter in Jahren ab. Da das Ingame-Jahr nur eine Jahreszahl
// ist (kein Monat/Tag), rechnet die Ableitung bewusst grob auf Jahresbasis:
// Alter = Ingame-Jahr − Geburtsjahr. Ist eins von beidem nicht gesetzt oder
// das Ergebnis negativ (Geburt liegt nach dem Ingame-Jahr), wird null
// zurückgegeben.
export function inferAgeFromDateOfBirth(
  dateOfBirth: string | null,
  ingameYear: number | null,
): number | null {
  if (!dateOfBirth || ingameYear == null) return null;
  const birthYear = Number(dateOfBirth.slice(0, 4));
  if (!Number.isInteger(birthYear)) return null;
  const age = ingameYear - birthYear;
  return age >= 0 ? age : null;
}

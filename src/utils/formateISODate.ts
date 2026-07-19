export function formatISODate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Für TIMESTAMPTZ-Felder (created_at, last_login_at, ...) mit Uhrzeit,
// anders als formatISODate oben (reines Datum, z.B. In-Story-Ereignisse).
// timeZone explizit gesetzt: ohne sie nutzt toLocaleString die Zeitzone der
// Laufzeitumgebung (auf Netlify UTC), nicht die eines deutschen Nutzers —
// Zeiten wurden dadurch 1-2h (CET/CEST) falsch angezeigt.
export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

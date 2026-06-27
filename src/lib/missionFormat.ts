// Geteilte, React-freie Helfer für Missionen/Logs — nutzbar in Server-
// und Client-Komponenten.
import { MissionStatus } from "@/types/missions";

export const STATUS_CONFIG: Record<
  MissionStatus,
  { label: string; color: string }
> = {
  active: { label: "Aktiv", color: "var(--lcars-green)" },
  completed: { label: "Abgeschlossen", color: "var(--lcars-blue)" },
  failed: { label: "Gescheitert", color: "var(--lcars-red)" },
  abandoned: { label: "Abgebrochen", color: "var(--lcars-amber)" },
};

// Farbzyklus für die Autor-Gruppen-Header in der Log-Liste.
export const AUTHOR_COLORS = [
  "var(--lcars-blue)",
  "var(--lcars-purple)",
  "var(--lcars-orange)",
  "var(--lcars-green)",
  "var(--lcars-amber)",
  "var(--lcars-red)",
];

// ISO-Datum (2400-09-15) → LCARS-Punktnotation (2400.09.15)
export function fmtDate(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10).replace(/-/g, ".");
}

// Zeitraum-Label. Offenes Ende → "LAUFEND".
export function periodLabel(start: string | null, end: string | null): string {
  const s = fmtDate(start);
  const e = end ? fmtDate(end) : "LAUFEND";
  return s ? `${s} – ${e}` : e;
}

// Jahr aus einem ISO-Datum, oder null.
export function yearOf(d: string | null): number | null {
  const y = d ? parseInt(d.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) ? y : null;
}

// Session-Label für die Log-Stubs.
export function sessionLabel(nr: number | null): string {
  return nr != null ? `S-${String(nr).padStart(2, "0")}` : "LOG";
}

// Absteigende Datums-Sortierung (ISO-Strings, NULL ans Ende).
export function byDateDesc(
  a: { log_date: string | null },
  b: { log_date: string | null },
): number {
  const da = a.log_date ?? "";
  const db = b.log_date ?? "";
  if (da === db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? 1 : -1;
}

// HTML grob zu Text für Meta-Descriptions.
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

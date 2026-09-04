import Link from "next/link";
import { PencilIcon } from "@/lib/icons";

// Eine Zeile mit allen möglichen Aktionen (Sichtbarkeit/Zusatz-Link/
// Bearbeiten/Löschen) statt gestapelter Einzelelemente — jede Aktion ist
// optional, da nicht jeder Inhaltstyp alle kennt (Missionen z.B. keine
// Sichtbarkeit, Gespräche kein Bearbeiten-Formular).
//
// Aus UserContentBrowser.tsx herausgelöst, seit die Charakter-Übersicht
// (/user/characters, siehe OwnCharacterList.tsx) dieselbe Aktionszeile
// braucht.
export default function ContentActionRow({
  visibility,
  extraAction,
  editHref,
  editLabel = "Bearbeiten",
  deleteButton,
}: {
  visibility?: React.ReactNode;
  // Zusätzliche Aktion vor dem Bearbeiten-Stift (z.B. „Werte" auf der
  // Charakter-Übersicht).
  extraAction?: React.ReactNode;
  editHref?: string;
  // Beschriftung des Stifts, wo „Bearbeiten" die Seite nicht trifft (die
  // Charakter-Übersicht führt damit auf die ganze Akte).
  editLabel?: string;
  deleteButton?: React.ReactNode;
}) {
  // flex-wrap + justify-end: passt die Zeile nicht in die Breite (Telefon),
  // rutscht sie in eine zweite Zeile, statt links aus dem Bild zu laufen.
  return (
    <div className="flex flex-wrap items-center justify-end gap-[8px]">
      {visibility}
      {extraAction}
      {editHref && (
        <Link
          href={editHref}
          className="lcars-icon-btn"
          aria-label={editLabel}
          title={editLabel}
        >
          <PencilIcon />
        </Link>
      )}
      {deleteButton}
    </div>
  );
}

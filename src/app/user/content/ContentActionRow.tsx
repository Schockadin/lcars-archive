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
  deleteButton,
}: {
  visibility?: React.ReactNode;
  // Zusätzliche Aktion vor dem Bearbeiten-Stift (z.B. „Werte" auf der
  // Charakter-Übersicht).
  extraAction?: React.ReactNode;
  editHref?: string;
  deleteButton?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[8px]">
      {visibility}
      {extraAction}
      {editHref && (
        <Link
          href={editHref}
          className="lcars-icon-btn"
          aria-label="Bearbeiten"
          title="Bearbeiten"
        >
          <PencilIcon />
        </Link>
      )}
      {deleteButton}
    </div>
  );
}

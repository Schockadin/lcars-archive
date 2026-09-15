import type { ReactNode } from "react";
import HelpButton from "./HelpButton";
import type { TutorialSectionId } from "@/lib/tutorialSections";

// Die Kopfzeile einer Bereichsseite: Augenbraue, Überschrift — und rechts
// davon der Fragezeichen-Knopf, der die Anleitung zu genau diesem Bereich
// öffnet.
//
// Als eigene Komponente, weil dieselben drei Zeilen sonst auf fünfzehn Seiten
// stünden (Leitungs-, Profil- und öffentliche Bereiche) und dabei
// unweigerlich auseinanderliefen — der Knopf soll überall an derselben Stelle
// sitzen, damit man ihn nicht sucht.
export default function HelpHeading({
  title,
  eyebrow,
  helpTitle,
  tutorial,
  children,
}: {
  title: string;
  eyebrow?: string;
  // Überschrift des Hilfe-Fensters, falls sie von der Seitenüberschrift
  // abweicht (z.B. Seite „Erfahrungspunkte" → Fenster „Leitung · AP").
  helpTitle?: string;
  tutorial?: TutorialSectionId;
  // Die Anleitung selbst. Wird von der (Server-)Seite gerendert und nur
  // durchgereicht — siehe HelpButton.
  children: ReactNode;
}) {
  return (
    <>
      {eyebrow && <p className="lcars-eyebrow">{eyebrow}</p>}
      <HelpTitleRow
        help={
          <HelpButton title={helpTitle ?? title} tutorial={tutorial}>
            {children}
          </HelpButton>
        }
      >
        <h1>{title}</h1>
      </HelpTitleRow>
    </>
  );
}

// Die Zeile selbst — auch direkt verwendbar für Seiten, deren Überschrift
// nicht aus HelpHeading kommen kann: Charakterliste, Chronologie, Datenbank
// und Suche tragen eine eigene Klasse an der h1 (lcars-data-row-heading) und
// ihre Augenbraue UNTER der Überschrift, die Charakterseiten eine Überschrift
// aus den Daten. Drei von ihnen bauen ihre Kopfzeile außerdem in einer
// Client-Komponente — die bekommt den fertigen Knopf als `help` gereicht,
// damit der Anleitungstext selbst server-gerendert bleibt.
//
// items-start statt items-center: Die Überschrift bringt ihren eigenen
// Abstand nach unten mit (h1 { margin-bottom: 20px }, siehe globals.css);
// zentriert hinge der Knopf dadurch schief unter der Schrift.
export function HelpTitleRow({
  help,
  children,
}: {
  help: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[12px]">
      {children}
      {help}
    </div>
  );
}

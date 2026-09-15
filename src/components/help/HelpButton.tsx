"use client";
import { useState, type ReactNode } from "react";
import ModalOverlay from "@/components/ModalOverlay";
import { HelpIcon } from "@/lib/icons";
import {
  tutorialSectionHref,
  type TutorialSectionId,
} from "@/lib/tutorialSections";

// Der Hilfe-Knopf: ein Fragezeichen, das die Anleitung zum gerade
// angezeigten Bereich als Fenster öffnet.
//
// Ein Icon statt einer beschrifteten Pille („Erschaffung erklärt", wie es
// hier einmal stand): Der Knopf steht jetzt auf jeder Bereichsseite neben der
// Überschrift, und fünfzehn verschieden beschriftete Knöpfe an fünfzehn
// Stellen sind fünfzehn Dinge zum Lesen. Ein Fragezeichen bedeutet überall
// dasselbe, braucht keine Zeile und drängt sich neben der Überschrift nicht
// vor. Die Beschriftung lebt im aria-label und im title (Tooltip).
//
// Ein Fenster und kein Link auf /tutorial: Nachschlagen soll nirgends
// bedeuten, die halb ausgefüllte Seite zu verlassen. Der Link auf die
// Anleitung steht trotzdem im Fenster — wer den Abschnitt verlinken oder
// daneben weiterlesen will, kommt so dorthin.
//
// Der Inhalt kommt als children von der jeweiligen Seite (fast immer eine
// Server-Komponente): So bleiben die Anleitungstexte selbst server-gerendert
// und wandern nicht in das Browser-Bündel jeder Seite, auf der ein
// Hilfe-Knopf steht.
export default function HelpButton({
  title,
  tutorial,
  children,
  className = "",
}: {
  // Überschrift des Fensters — zugleich die Beschriftung des Knopfs
  // („Hilfe: <title>").
  title: string;
  // Abschnitt der Anleitung, in dem derselbe Text steht. Ohne Angabe
  // entfällt der Link ans Ende des Fensters.
  tutorial?: TutorialSectionId;
  children: ReactNode;
  // Zusätzliche Klassen für die Leiste, in der der Knopf steht (z.B.
  // self-start in einer Knopfreihe).
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = `Hilfe: ${title}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`lcars-icon-btn ${className}`.trim()}
        aria-label={label}
        title={label}
      >
        <HelpIcon />
      </button>

      {open && (
        // Breit und hoch: Das ist ein Fenster zum Lesen, kein Formular — bei
        // 760px stand der Text in einer schmalen Säule, und die Schemata
        // neben den Abschnitten (ab 900px) hatten gar keinen Platz.
        <ModalOverlay
          title={title}
          onClose={() => setOpen(false)}
          width={1040}
          tall
        >
          {children}
          {tutorial && (
            <p className="lcars-text text-[13px]">
              <a
                href={tutorialSectionHref(tutorial)}
                className="lcars-wikilink"
              >
                Derselbe Abschnitt in der Anleitung
              </a>
            </p>
          )}
        </ModalOverlay>
      )}
    </>
  );
}

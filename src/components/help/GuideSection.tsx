import type { ReactNode } from "react";

// Ein Abschnitt einer Anleitung: Überschrift, Text und daneben (auf breiten
// Schirmen) sein Schema. Unter 900px rutscht das Bild unter den Text —
// nebeneinander bliebe für beide zu wenig Breite.
//
// Geteilt von allen Anleitungen (Charaktererschaffung, Leitungs-, Profil- und
// Besucher-Bereiche): Jede von ihnen steht sowohl als Abschnitt in /tutorial
// als auch als Fenster an der Stelle, an der man sie braucht — sie müssen
// also überall gleich aussehen.
//
// Bewusst reines JSX ohne Hooks, Server-Importe und "use client": so lässt
// sich dieselbe Datei von der server-gerenderten Anleitung UND aus einem
// Client-Fenster heraus einbinden.
export default function GuideSection({
  title,
  figure,
  children,
}: {
  title: string;
  figure?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-[10px]">
      {/* h3, nicht h2: Im Fenster steht darüber die h2 des Fenster-Kopfs
          (siehe ModalOverlay) — dort stimmt die Staffelung also genau. In der
          Anleitung sitzt an dieser Stelle die Akkordeon-Zeile, die ein
          <button> ist und keine Überschrift; dort fehlt zwischen der h1
          „Tutorial" und diesen Abschnitten formal eine Ebene. Das gilt für
          jeden Abschnitt der Anleitung gleichermaßen und ist keine Eigenheit
          eines einzelnen Textes — die Alternative wäre, die Überschriftenebene
          je Einbettung durchzureichen, was einen Text mit zwei verschiedenen
          Ebenen hinterließe. */}
      <h3 className="text-[17px] font-bold tracking-[0.08em] uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-[12px] min-[900px]:flex-row min-[900px]:items-start min-[900px]:gap-[20px]">
        <div className="flex flex-col gap-[12px] min-[900px]:flex-1">
          {children}
        </div>
        {figure && (
          <div className="min-[900px]:w-[280px] shrink-0">{figure}</div>
        )}
      </div>
    </section>
  );
}

// Der Rahmen um eine Reihe von GuideSections. gap-[24px] statt der 12px
// zwischen Absätzen: Der Abstand ZWISCHEN Abschnitten muss größer sein als
// der innerhalb, sonst trägt die Gliederung nicht.
export function GuideBody({ children }: { children: ReactNode }) {
  return <div className="lcars-text flex flex-col gap-[24px]">{children}</div>;
}

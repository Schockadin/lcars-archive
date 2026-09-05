import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import PageSkeleton from "@/app/_shared/PageSkeleton";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { getCurrentUser } from "@/lib/dal";
import { getOnboardingSteps } from "@/lib/onboarding";
import { onboardingProgress } from "@/lib/onboardingSteps";
import { tutorialSectionHref } from "@/lib/tutorialSections";

export const metadata: Metadata = {
  title: "Erste Schritte",
};

// Einstieg für neue Spielerinnen und Spieler: was dieses Archiv ist, und eine
// Liste der ersten Schritte mit direktem Link in den jeweiligen Ablauf.
//
// Bewusst eine eigene Seite und kein Assistent, der sich vor das Dashboard
// schiebt: wer schon weiß, wohin er will, soll nicht durch fünf Bildschirme
// klicken müssen. Die Seite bleibt auch danach erreichbar (sie ist dann eine
// Übersicht mit lauter Haken), das Dashboard verweist nur so lange darauf,
// wie noch etwas offen ist.
//
// Nicht gecacht: der Fortschritt hängt am angemeldeten Konto.
// Unter cacheComponents muss jeder Laufzeit-Zugriff (Session-Cookie, DB) in
// einer Suspense-Grenze liegen, damit die statische Shell sofort ausgeliefert
// wird — deshalb die Aufteilung in Seite und Inhalt.
export default function WillkommenPage() {
  return (
    <>
      <PageMeta title="Erste Schritte" section="home" />
      <Suspense fallback={<PageSkeleton />}>
        <WillkommenContent />
      </Suspense>
    </>
  );
}

async function WillkommenContent() {
  const user = await getCurrentUser();
  const steps = await getOnboardingSteps(user.id);
  const progress = onboardingProgress(steps);

  return (
    <article className="lcars-wide-column flex flex-col gap-[16px]">
      <div>
        <h1 className="lcars-data-row-heading">Erste Schritte</h1>
        <p className="lcars-eyebrow">Willkommen an Bord, {user.name}</p>
      </div>

      <div className="lcars-text flex flex-col gap-[16px]">
        <p>
          Dieses Archiv ist das Gedächtnis unserer Runde: hier stehen die
          <strong> Charaktere</strong>, die <strong>Missionen</strong>, die{" "}
          <strong>Logbücher</strong> zu jeder Sitzung und die{" "}
          <strong>Gespräche</strong>, die eure Figuren zwischen den Sitzungen
          führen. Dazu eine Datenbank mit allem, was in der Kampagne vorkommt.
        </p>

        {progress.complete ? (
          <p>
            Du hast alles erledigt — diese Seite bleibt als Übersicht stehen,
            falls du etwas nachschlagen willst.
          </p>
        ) : (
          <p>
            Der Reihe nach ist alles Folgende sinnvoll; nötig ist davon nur,
            was du auch nutzen willst.
          </p>
        )}

        <OnboardingChecklist steps={steps} />

        <p>
          Alles Weitere steht in der{" "}
          <Link href="/tutorial" className="underline">
            Anleitung
          </Link>{" "}
          — dort ist jeder Bereich ausführlich beschrieben, von{" "}
          <Link href={tutorialSectionHref("markdown")} className="underline">
            Markdown
          </Link>{" "}
          über{" "}
          <Link href={tutorialSectionHref("verlinkung")} className="underline">
            Verlinkung
          </Link>{" "}
          bis zum{" "}
          <Link href={tutorialSectionHref("farbschema")} className="underline">
            Farbschema
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

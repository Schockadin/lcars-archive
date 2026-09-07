import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listFocusesFresh } from "@/lib/focuses";
import FocusEditor from "./FocusEditor";

export const metadata: Metadata = {
  title: "Schwerpunkte",
  robots: { index: false, follow: false },
};

// Schwerpunkt-Katalog der Runde verwalten — Gegenstück zu /gm/talents.
// Bewusst listFocusesFresh (ungecacht): eine gerade gespeicherte Änderung muss
// beim Zurückkehren sofort dastehen. Die gecachte Variante (listFocuses)
// nutzen die Charakterbögen.
export default async function GmFocusesPage() {
  await requireGM();
  const focuses = await listFocusesFresh();

  return (
    <>
      <PageMeta title="Schwerpunkte" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Schwerpunkte</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-contrast text-[13px]">
            Der Katalog speist die Auswahlliste auf den Charakterbögen — frei
            eingetippte Schwerpunkte gibt es nicht mehr. Die importierten
            Einträge stammen aus dem Regeltext und lassen sich anpassen;
            löschen lassen sich nur selbst ergänzte, damit keine Einträge unter
            bereits gepflegten Charakterbögen verschwinden.
          </p>
          <FocusEditor focuses={focuses} />
        </div>
      </article>
    </>
  );
}

import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listTalentsFresh } from "@/lib/talents";
import TalentEditor from "./TalentEditor";

export const metadata: Metadata = {
  title: "Talente",
  robots: { index: false, follow: false },
};

// Talent-Katalog der Runde verwalten. Bewusst listTalentsFresh (ungecacht):
// eine gerade gespeicherte Änderung muss beim Zurückkehren sofort dastehen.
// Die gecachte Variante (listTalents) nutzen die Charakterbögen.
export default async function GmTalentsPage() {
  await requireGM();
  const talents = await listTalentsFresh();

  return (
    <>
      <PageMeta title="Talente" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Talente</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-contrast text-[13px]">
            Der Katalog speist die Auswahlliste auf den Charakterbögen. Die
            importierten Talente stammen aus dem Regeltext und lassen sich
            anpassen; löschen lassen sich nur selbst ergänzte, damit keine
            Einträge unter bereits gepflegten Charakterbögen verschwinden.
          </p>
          <TalentEditor talents={talents} />
        </div>
      </article>
    </>
  );
}

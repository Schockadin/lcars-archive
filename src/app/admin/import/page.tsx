import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { getAllMissions } from "@/lib/missions";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import MarkdownImportPanel from "@/app/_shared/import/MarkdownImportPanel";
import { IMPORT_CONTENT_TYPES } from "@/lib/importAccess";

export const metadata: Metadata = {
  title: "Import",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

// Der Import der Administration: alle vier Arten, alle Charaktere als
// mögliche Autoren, Eigentümer frei wählbar — der Weg für den Umzug fremder
// Inhalte aus dem Vault. Die Nutzerschaft hat seit v1.50 unter /user/import
// ihren eigenen, engeren Zugang (src/lib/importAccess.ts); die Oberfläche
// (MarkdownImportPanel) ist dieselbe, deshalb liegt sie unter
// src/app/_shared/import.
//
// missions/characters werden hier einmalig geladen (nicht im Panel selbst)
// für die Mission/Autor-Auswahlfelder der Missionslog-Vorschau — dieselben
// Listen, die auch das normale "Neuer Missionslog"-Formular nutzt.
export default async function AdminImportPage() {
  await requireAdmin();

  const [missions, characters] = await Promise.all([
    getAllMissions(),
    getCharactersForParticipantPicker(),
  ]);

  return (
    <>
      <PageMeta title="Import" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Import</h1>

        <MarkdownImportPanel
          missions={missions.map((m) => ({ slug: m.slug, title: m.title }))}
          characters={characters.map((c) => ({
            slug: c.slug,
            name: c.name,
            playerName: c.playerName,
          }))}
          allowedTypes={IMPORT_CONTENT_TYPES}
          canChooseOwner
        />
      </article>
    </>
  );
}

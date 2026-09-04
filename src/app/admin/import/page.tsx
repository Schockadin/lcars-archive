import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { getAllMissions } from "@/lib/missions";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import MarkdownImportPanel from "./MarkdownImportPanel";

export const metadata: Metadata = {
  title: "Import",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

// Admin-only: Markdown-Datei-Upload (einzeln oder mehrere), aus denen nach
// individueller Bestätigung neue Archiv-Einträge/Missionen/Charaktere/
// Missionslogs entstehen — siehe src/lib/markdownImport.ts. missions/
// characters werden hier einmalig geladen (nicht im Panel selbst) für die
// Mission/Autor-Auswahlfelder der Missionslog-Vorschau — dieselben Listen,
// die auch das normale "Neuer Missionslog"-Formular nutzt.
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
        />
      </article>
    </>
  );
}

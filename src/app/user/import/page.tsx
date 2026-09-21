import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { getCurrentUser, getRoleMap } from "@/lib/dal";
import { userCan } from "@/lib/permissions";
import { allowedImportTypes } from "@/lib/importAccess";
import { getAllMissions } from "@/lib/missions";
import {
  getCharactersForParticipantPicker,
  getCharactersForUser,
} from "@/lib/characters";
import MarkdownImportPanel from "@/app/_shared/import/MarkdownImportPanel";
import HelpHeading from "@/components/help/HelpHeading";
import { ImportGuide } from "@/components/help/guides/UserGuides";

export const metadata: Metadata = {
  title: "Import",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

// Der Import für die normale Nutzerschaft — erreichbar über den Knopf im
// Abschnitt „Neue Inhalte" (Startseite und „Meine Inhalte"). Bis v1.49 gab
// es ihn nur unter /admin/import; wer kein Admin war, sah den Knopf gar
// nicht erst.
//
// Was hier anders ist als unter /admin/import, entscheidet nicht diese
// Seite, sondern src/lib/importAccess.ts und die beiden Actions:
//   * angeboten werden nur die Arten, die diese Person auch über das
//     normale Formular anlegen dürfte (Eintrag: eingeloggt, Charakter und
//     Logbuch: content.create, Mission: missions.manage),
//   * der Eigentümer ist immer der Aufrufer — das Feld dafür fehlt,
//   * ein Logbuch lässt sich nur einer eigenen Figur zuschreiben.
// Die Auswahllisten hier folgen dem nur: Sie zeigen die eigenen Figuren,
// damit gar nicht erst danebengegriffen wird.
//
// Für ein Admin-Konto, das diesen Weg nimmt, gelten dieselben Rechte wie
// unter /admin/import (der Eigentümer bleibt frei wählbar, alle Figuren
// stehen zur Wahl) — sonst wäre derselbe Knopf für die Administration ein
// Rückschritt.
export default async function UserImportPage() {
  const user = await getCurrentUser();
  const roleMap = await getRoleMap();
  const allowedTypes = allowedImportTypes(user, roleMap);
  const isAdmin = userCan(user, "admin.access", roleMap);

  // Mission und Autor braucht nur die Logbuch-Vorschau. Wer keine Logbücher
  // importieren darf, löst damit auch keine der beiden Abfragen aus.
  const brauchtLogListen = allowedTypes.includes("mission_log");
  const [missions, alleCharaktere, eigeneCharaktere] = await Promise.all([
    brauchtLogListen ? getAllMissions() : Promise.resolve([]),
    brauchtLogListen && isAdmin
      ? getCharactersForParticipantPicker()
      : Promise.resolve([]),
    brauchtLogListen && !isAdmin
      ? getCharactersForUser(user.id)
      : Promise.resolve([]),
  ]);

  const characters = isAdmin
    ? alleCharaktere.map((c) => ({
        slug: c.slug,
        name: c.name,
        playerName: c.playerName,
      }))
    : // Entwürfe bleiben draußen — dieselbe Regel wie im normalen
      // Logbuch-Formular (loadNewContentData) und in ownsCharacterSlug, das
      // die Action anschließend prüft.
      eigeneCharaktere
        .filter((c) => !c.is_draft)
        .map((c) => ({ slug: c.slug, name: c.name, playerName: user.name }));

  return (
    <>
      <PageMeta title="Import" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <HelpHeading title="Import" tutorial="eigene-inhalte">
          <ImportGuide />
        </HelpHeading>

        <MarkdownImportPanel
          missions={missions.map((m) => ({ slug: m.slug, title: m.title }))}
          characters={characters}
          allowedTypes={allowedTypes}
          canChooseOwner={isAdmin}
        />
      </article>
    </>
  );
}

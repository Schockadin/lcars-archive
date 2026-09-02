import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../../dal";
import NewArchiveEntryForm from "./NewArchiveEntryForm";
import { ARCHIVE_CATEGORIES } from "@/lib/archiveFormat";
import type { ArchiveCategory } from "@/types/archive";

export const metadata: Metadata = {
  title: "Neuer Datenbank-Eintrag",
  robots: { index: false, follow: false },
};

// Anders als Missionen (nur gm/admin) oder Missionslogs (nur mit eigenem
// Charakter) darf JEDER eingeloggte User Archiv-Einträge anlegen — daher
// requireOwnUser statt requireOwnGM/requireOwnCharacters (keine Rollen-/
// Charakter-Voraussetzung).
interface Props {
  // ?category=npc o. ä. wählt die Kategorie vor — Einstieg dorthin ist der
  // Knopf „Neuer NPC" unter /user/content. Unbekannte Werte werden ignoriert,
  // ändern lässt sich die Kategorie im Formular ohnehin.
  searchParams: Promise<{ category?: string }>;
}

export default async function NewArchiveEntryPage({ searchParams }: Props) {
  const user = await requireOwnUser();
  const roleMap = await getRoleMap();
  const requested = (await searchParams).category;
  // "dialogue" ist keine von Hand anlegbare Kategorie (Gespräche entstehen
  // unter /user/dialogues/new) — deshalb hier ausgenommen.
  const initialCategory: Exclude<ArchiveCategory, "dialogue"> =
    requested !== "dialogue" &&
    (ARCHIVE_CATEGORIES as readonly string[]).includes(requested ?? "")
      ? (requested as Exclude<ArchiveCategory, "dialogue">)
      : "other";

  return (
    <>
      <PageMeta title="Neuer Datenbank-Eintrag" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Neuen Datenbank-Eintrag anlegen</h1>
        <NewArchiveEntryForm
          userId={user.id}
          initialCategory={initialCategory}
          isAdminOrGM={userCan(user, "content.autolink_tools", roleMap)}
        />
      </article>
    </>
  );
}

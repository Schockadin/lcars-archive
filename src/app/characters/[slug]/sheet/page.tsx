// src/app/characters/[slug]/sheet/page.tsx
//
// Der Charakterbogen als reine ANSICHT — die Seite, auf die der Knopf
// „Charakterbogen" auf der Charakterseite zeigt. Sichtbar für die eigene
// Spielerin/den eigenen Spieler (player_id) und für die Spielleitung
// (gm.access); für alle anderen gibt es die Seite nicht (notFound statt 403 —
// die Werte eines fremden Charakters sollen nicht einmal als „existiert, aber
// verboten" durchscheinen).
//
// Bearbeitet wird der Bogen weiterhin ausschließlich unter
// /user/characters/[id]/stats, also vom Owner selbst.
import { notFound } from "next/navigation";
import {
  getCharacterBySlug,
  getCharacterStatsForGm,
  getOwnCharacterStats,
} from "@/lib/characters";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import PageMeta from "@/components/PageMeta";
import PersonnelFileView from "@/components/character/PersonnelFileView";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  return {
    title: character
      ? `Charakterbogen · ${character.name} · Neo Archive`
      : "Nicht gefunden · Neo Archive",
    // Ein Charakterbogen ist Spielmaterial, keine öffentliche Seite.
    robots: { index: false, follow: false },
  };
}

export default async function CharacterSheetPage({ params }: Props) {
  const { slug } = await params;

  const [character, viewer] = await Promise.all([
    getCharacterBySlug(slug),
    getViewer(),
  ]);
  if (!character) notFound();

  const isOwner = viewer != null && viewer.userId === character.player_id;
  const isGM = viewerHasPermission(viewer, "gm.access");
  if (!isOwner && !isGM) notFound();

  // getCharacterBySlug lässt metadata.stats bewusst weg (die Charakterseite
  // ist eine Client-Komponente, siehe parseCharacter) — die Werte deshalb
  // eigens laden. Für den Owner owner-gescoped, für die Spielleitung über die
  // ungescopte Variante, deren Berechtigung oben geprüft ist.
  const sheet = isOwner
    ? await getOwnCharacterStats(viewer!.userId, character.id)
    : await getCharacterStatsForGm(character.id);
  if (!sheet) notFound();

  return (
    <div className="lcars-wide-column">
      <PageMeta title={character.name} section="characters" />

      <h1>Charakterbogen: {sheet.name}</h1>
      <p className="lcars-text">
        Der Bogen zum Lesen. Gepflegt wird er von der Spielerin/dem Spieler
        selbst unter „Meine Charaktere &rarr; Werte&ldquo;.
      </p>

      <p className="lcars-text">
        {/* Download über einen Link statt einer Action: der Browser lädt die
            Datei dann direkt über Content-Disposition herunter. */}
        <a
          href={`/api/export/character-sheet?characterId=${sheet.id}`}
          className="lcars-pill-btn--outline inline-flex"
          download
        >
          Bogen als PDF
        </a>
      </p>

      <article className="mb-[10px]">
        <PersonnelFileView
          characterName={sheet.name}
          rank={sheet.rank}
          species={sheet.species}
          portrait={sheet.portrait}
          stats={sheet.stats}
        />
      </article>
    </div>
  );
}

// src/app/characters/[slug]/sheet/page.tsx
//
// Der Charakterbogen als reine ANSICHT — die Seite, auf die der Knopf
// „Charakterbogen" auf der Charakterseite zeigt. Sichtbar für die eigene
// Spielerin/den eigenen Spieler (player_id) und für die Spielleitung
// (gm.access); für alle anderen gibt es die Seite nicht (notFound statt 403 —
// die Werte eines fremden Charakters sollen nicht einmal als „existiert, aber
// verboten" durchscheinen).
//
// Gezeigt werden dieselben DREI Blätter wie im Vorschau-Fenster unter
// /user/characters/[id] (CharacterSheetPreview) und dieselben, die der
// PDF-Export erzeugt. Vorher stand hier nur Blatt 1 — die Seite zeigte also
// etwas anderes als der Knopf daneben herunterlud.
//
// Bearbeitet wird der Bogen weiterhin ausschließlich unter
// /user/characters/[id], also vom Owner selbst.
import { notFound } from "next/navigation";
import {
  getCharacterBySlug,
  getCharacterStatsForGm,
  getOwnCharacterStats,
} from "@/lib/characters";
import { listTalents } from "@/lib/talents";
import { listCampaignRules } from "@/lib/campaignRules";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import PageMeta from "@/components/PageMeta";
import CharacterSheetPreview from "@/components/character/CharacterSheetPreview";
import PrintSheetButton from "@/components/character/PrintSheetButton";

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

  // Blatt 2 braucht den Talent-Katalog (der Regeltext steht nicht am
  // Charakter) und die Hausregeln der Runde — dieselben Quellen wie im
  // PDF-Export.
  const [talents, campaignRules] = await Promise.all([
    listTalents(),
    listCampaignRules(),
  ]);

  return (
    <div className="lcars-wide-column pf-preview-page">
      <PageMeta title={character.name} section="characters" />

      <h1>Charakterbogen: {sheet.name}</h1>
      <p className="lcars-text">
        Der Bogen zum Lesen. Gepflegt wird er von der Spielerin/dem Spieler
        selbst unter „Meine Charaktere &rarr; Werte&ldquo;.
      </p>

      {/* Dieselben zwei Aktionen wie im Vorschau-Fenster: über den Browser
          drucken oder die PDF-Fassung derselben Blätter speichern. Der
          Download läuft über einen Link statt einer Action, damit der Browser
          die Datei direkt über Content-Disposition entgegennimmt. */}
      <p className="lcars-text flex flex-wrap items-center gap-[8px]">
        <PrintSheetButton />
        <a
          href={`/api/export/character-sheet?characterId=${sheet.id}`}
          className="lcars-pill-btn--outline inline-flex"
          download
        >
          Bogen als PDF
        </a>
      </p>

      <article className="mb-[10px]">
        <CharacterSheetPreview
          input={{
            characterName: sheet.name,
            rank: sheet.rank,
            species: sheet.species,
            portrait: sheet.portrait,
            stats: sheet.stats,
            // characters.bio hält bereits das gerenderte, bereinigte HTML
            // (siehe updateOwnCharacterBio) — dieselbe Quelle wie die
            // Charakterseite.
            bioHtml: character.bio,
            talents,
            campaignRules,
          }}
        />
      </article>
    </div>
  );
}

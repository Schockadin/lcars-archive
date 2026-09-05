// Lädt den Charakterbogen eines eigenen Charakters als PDF herunter (Knopf
// „Speichern" in der Bogen-Vorschau) — gleiches Muster wie der
// Content-Export im Nachbarordner: eine Route statt einer Server Action, damit
// der Browser den Download über Content-Disposition direkt anstößt.
//
// Die Berechtigung steckt wie überall in der Abfrage selbst
// (getOwnCharacterStats ist owner-gescoped): ein fremder Charakter liefert
// null und damit 404 — das verrät auch nicht, ob es die id überhaupt gibt.
// Die Spielleitung (gm.access) darf zusätzlich den Bogen JEDES Charakters
// ziehen — dieselbe Leseberechtigung wie die Ansicht unter
// /characters/[slug]/sheet.
import { verifySession } from "@/lib/dal";
import {
  getCharacterBioMarkdown,
  getCharacterStatsForGm,
  getOwnCharacterStats,
} from "@/lib/characters";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { listTalents } from "@/lib/talents";
import { listCampaignRules } from "@/lib/campaignRules";
import { renderCharacterSheetPdf } from "@/lib/pdf/CharacterSheetPdfDocument";
import { slugifyBase } from "@/lib/slug";

export async function GET(request: Request) {
  const session = await verifySession();

  const url = new URL(request.url);
  const characterId = Number(url.searchParams.get("characterId") ?? "");
  if (!Number.isInteger(characterId)) {
    return new Response("Ungültige Export-Anfrage.", { status: 400 });
  }

  const owned = await getOwnCharacterStats(session.userId, characterId);
  const character =
    owned ??
    (viewerHasPermission(await getViewer(), "gm.access")
      ? await getCharacterStatsForGm(characterId)
      : null);
  if (!character) {
    return new Response("Charakter nicht gefunden oder kein Zugriff.", {
      status: 404,
    });
  }

  // Die Biografie steht nicht an den Werten, sondern als Markdown an der
  // Akte — für das dritte Blatt eigens geladen (ungescopt, die Berechtigung
  // ist oben bereits geklärt).
  const [talents, bio, campaignRules] = await Promise.all([
    listTalents(),
    getCharacterBioMarkdown(characterId),
    listCampaignRules(),
  ]);
  const pdfBuffer = await renderCharacterSheetPdf({
    name: character.name,
    rank: character.rank,
    species: character.species,
    portrait: character.portrait,
    stats: character.stats,
    talents,
    campaignRules,
    bioMarkdown: bio,
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="charakterbogen-${slugifyBase(character.name)}.pdf"`,
      // Der Bogen enthält Charakterdaten — nicht in Zwischenspeichern ablegen.
      "Cache-Control": "private, no-store",
    },
  });
}

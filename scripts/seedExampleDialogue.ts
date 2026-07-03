// scripts/seedExampleDialogue.ts
//
// Einmaliges Demo-/Testdaten-Skript: verknüpft die Charaktere
// "desmond-helben" und "lorzan-keen" mit user_id 1 und legt zwischen ihnen
// einen kleinen Beispiel-Dialog an. Kein Bestandteil von db:ingest — reiner
// eigenständiger tsx-Einstiegspunkt wie scripts/reset-db.ts.
//
// Nutzt dieselben Funktionen wie die App selbst (createDialogue,
// postDialogueMessage aus src/lib/dialoguesCore.ts) statt duplizierter
// Insert-Logik in rohem SQL — dadurch automatisch korrektes
// metadata.participants-Format und korrekt sanitisiertes Markdown, exakt
// wie ein echter User-Flow.
import sql from "@/lib/db";
import { createDialogue, postDialogueMessage } from "@/lib/dialoguesCore";
import { slugifyBase } from "@/lib/slug";

const OWNER_USER_ID = 1;
const DESMOND_SLUG = "desmond-helben";
const LORZAN_SLUG = "lorzan-keen";
const DIALOGUE_TITLE = "Ein Gespräch zwischen Desmond Helben und Lorzan Keen";

async function main() {
  const [desmond] = await sql<{ id: number; name: string; player_id: number | null }[]>`
    SELECT id, name, player_id FROM characters WHERE slug = ${DESMOND_SLUG}
  `;
  const [lorzan] = await sql<{ id: number; name: string; player_id: number | null }[]>`
    SELECT id, name, player_id FROM characters WHERE slug = ${LORZAN_SLUG}
  `;

  if (!desmond) {
    throw new Error(`Charakter mit slug "${DESMOND_SLUG}" nicht gefunden.`);
  }
  if (!lorzan) {
    throw new Error(`Charakter mit slug "${LORZAN_SLUG}" nicht gefunden.`);
  }

  await sql`
    UPDATE characters SET player_id = ${OWNER_USER_ID}
    WHERE slug IN (${DESMOND_SLUG}, ${LORZAN_SLUG})
  `;
  console.log(
    `✓ ${desmond.name} und ${lorzan.name} mit user_id ${OWNER_USER_ID} verknüpft.`,
  );

  const expectedSlug = slugifyBase(DIALOGUE_TITLE);
  const [existing] = await sql<{ slug: string }[]>`
    SELECT slug FROM archive_entries WHERE slug = ${expectedSlug}
  `;
  if (existing) {
    console.log(`↷ Beispiel-Dialog existiert bereits: /dialogues/${existing.slug} (bzw. /archive/${existing.slug}, falls bereits abgeschlossen)`);
    await sql.end();
    return;
  }

  const { slug } = await createDialogue({
    title: DIALOGUE_TITLE,
    ownCharacterId: desmond.id,
    partnerCharacterId: lorzan.id,
    authorUserId: OWNER_USER_ID,
    setting: null,
    locationSlug: null,
    logDate: null,
    tags: [],
    bodyMarkdown:
      "Lorzan, hast du einen Moment? Ich habe mir die Sensor-Protokolle von " +
      "gestern noch einmal angesehen — da stimmt etwas nicht.",
  });

  const [{ id: archiveEntryId }] = await sql<{ id: number }[]>`
    SELECT id FROM archive_entries WHERE slug = ${slug}
  `;

  await postDialogueMessage({
    archiveEntryId,
    characterId: lorzan.id,
    authorUserId: OWNER_USER_ID,
    bodyMarkdown:
      "Natürlich, Desmond. Was genau ist dir aufgefallen? Wenn es die " +
      "Werte aus Sektor 3 sind — die habe ich mir auch schon angeschaut.",
  });

  await postDialogueMessage({
    archiveEntryId,
    characterId: desmond.id,
    authorUserId: OWNER_USER_ID,
    bodyMarkdown:
      "Genau die. Die Abweichung ist klein, aber **konstant** — das sieht " +
      "mir nicht nach einem Messfehler aus. Können wir uns das gemeinsam " +
      "genauer ansehen?",
  });

  console.log(`✓ Beispiel-Dialog angelegt: /dialogues/${slug}`);
  await sql.end();
}

main().catch((err) => {
  console.error("✗ Fehler:", err);
  process.exit(1);
});

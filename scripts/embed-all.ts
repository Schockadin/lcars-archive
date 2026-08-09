// Initial-Backfill / Voll-Neuaufbau des Vektor-Index (content_embeddings).
//
// Läuft per tsx außerhalb von Next (analog scripts/ingest/index.ts) und nutzt
// dieselbe Logik wie die Fire-and-forget-Trigger der App: embedOne() aus
// src/lib/embeddingSync.ts (Fetch → Chunk → OpenAI-Embedding → Upsert).
//
// Aufruf:
//   npm run embed:all            (nutzt .env.local)
//   npm run embed:all:dev        (nutzt .env.development.local)
//   npm run embed:all -- character mission   (nur bestimmte Typen)
//
// Voraussetzung: OPENAI_API_KEY gesetzt und pgvector + content_embeddings in
// der DB angelegt (scripts/schema.sql bzw. scripts/migrate-pr54.sql).

import sql from "@/lib/db";
import { hasEmbeddingConfig, type EmbeddingContentType } from "@/lib/embeddings";
import { embedOne, listEmbeddableTargets } from "@/lib/embeddingSync";

const ALL_TYPES: EmbeddingContentType[] = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
  "dialogue",
];

async function main() {
  if (!hasEmbeddingConfig()) {
    console.error(
      "✗ OPENAI_API_KEY ist nicht gesetzt — Embedding nicht möglich.",
    );
    process.exitCode = 1;
    return;
  }

  // Optionale Typ-Filter aus der Kommandozeile.
  const filters = process.argv
    .slice(2)
    .map((a) => a.trim())
    .filter((a): a is EmbeddingContentType =>
      (ALL_TYPES as string[]).includes(a),
    );
  const wanted = filters.length > 0 ? new Set(filters) : new Set(ALL_TYPES);

  console.log("🔎 Sammle embedding-fähige Inhalte…");
  const targets = (await listEmbeddableTargets(sql)).filter((t) =>
    wanted.has(t.contentType),
  );
  console.log(`   ${targets.length} Inhalte gefunden (${[...wanted].join(", ")}).`);

  let embedded = 0;
  let removed = 0;
  const errors: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const { contentType, contentId } = targets[i];
    try {
      const outcome = await embedOne(sql, contentType, contentId);
      if (outcome === "embedded") embedded++;
      else removed++;
      if ((i + 1) % 20 === 0 || i + 1 === targets.length) {
        console.log(`   … ${i + 1}/${targets.length}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${contentType}#${contentId}: ${msg}`);
      console.error(`   ✗ ${contentType}#${contentId}: ${msg}`);
    }
  }

  console.log(
    `\n✓ Fertig. Embedded: ${embedded}, entfernt/leer: ${removed}, Fehler: ${errors.length}`,
  );
  if (errors.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("✗ Backfill fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void sql.end();
  });

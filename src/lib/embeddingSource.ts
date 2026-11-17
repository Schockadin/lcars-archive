import type { EmbeddingContentType, SqlClient } from "@/lib/embeddings";

// Nur tatsächlich indizierte Inhalte versionieren: ein neuer Owner, ein
// Draft-Wechsel oder geänderte Charakterwerte machen denselben Text nicht alt.
// SQL erzeugt denselben SHA-256 beim Lesen, Schreiben und Retrieval; dafür
// werden weder eine Schemaänderung noch eine Uhrzeit aus dem App-Prozess benötigt.
export function embeddingSourceFingerprint(
  client: SqlClient,
  type: EmbeddingContentType,
) {
  const fields = (() => {
    switch (type) {
      case "character":
        return client`c.source_md, c.bio, c.name, c.species, c.rank, c.status, c.slug`;
      case "mission":
        return client`m.source_md, m.title, m.status, m.started_at::text, m.ended_at::text, m.slug`;
      case "mission_log":
        // Namen/Slugs der Mission und des Autors werden unabhängig geändert.
        // Solche Headerkorrekturen dürfen den unveränderten Logtext nicht sperren.
        return client`ml.source_md, ml.content, ml.title, ml.session_nr, ml.log_date::text, ml.slug`;
      case "archive_entry":
      case "dialogue":
        return client`a.source_md, a.content, a.title, a.category, a.metadata->>'setting',
                      a.metadata->'participants', a.slug`;
    }
  })();
  return client`encode(sha256(convert_to(jsonb_build_array(${fields})::text, 'UTF8')), 'hex')`;
}

// Der kurze Row-Lock gilt nur während des SQL-Schreibstatements, niemals
// während des externen Embedding-Aufrufs. Alte Jobs dürfen aktuelle Chunks
// weder überschreiben noch als vermeintlichen Überhang löschen.
export function embeddingSourceGuard(
  client: SqlClient,
  type: EmbeddingContentType,
  id: number,
  fingerprint: string,
) {
  const matches = embeddingSourceFingerprint(client, type);
  switch (type) {
    case "character":
      return client`EXISTS (SELECT 1 FROM characters c WHERE c.id = ${id}
        AND ${matches} = ${fingerprint} FOR SHARE OF c)`;
    case "mission":
      return client`EXISTS (SELECT 1 FROM missions m WHERE m.id = ${id}
        AND ${matches} = ${fingerprint} FOR SHARE OF m)`;
    case "mission_log":
      return client`EXISTS (SELECT 1 FROM mission_logs ml
        WHERE ml.id = ${id} AND ${matches} = ${fingerprint} FOR SHARE OF ml)`;
    case "archive_entry":
    case "dialogue":
      return client`EXISTS (SELECT 1 FROM archive_entries a WHERE a.id = ${id}
        AND ${matches} = ${fingerprint} FOR SHARE OF a)`;
  }
}

import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import EmbeddingsBackfillPanel from "./EmbeddingsBackfillPanel";
import OpenAiUsagePanel from "./OpenAiUsagePanel";

export const metadata: Metadata = {
  title: "RAG",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

// Admin-only: Werkzeuge rund um den Archiv-Assistenten (RAG). Bündelt den
// Voll-Backfill des Vektor-Index (vorher unter /admin/scripts) und die
// OpenAI-Nutzungsanzeige (Kosten/Guthaben des Kontos, das die Embeddings
// erzeugt). Gleiche Zugriffsschwelle wie die übrigen Admin-Werkzeuge
// (admin.access) — der Proxy (src/proxy.ts) hält Anonyme fern, das
// Admin-Layout (requireStaff) die Nicht-Staff, und diese Seite verschärft auf
// requireAdmin.
export default async function AdminRagPage() {
  await requireAdmin();

  return (
    <>
      <PageMeta title="RAG" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Datenbank-Assistent</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Embeddings</h2>
            <EmbeddingsBackfillPanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">
              OpenAI · Nutzung &amp; Guthaben
            </h2>
            <OpenAiUsagePanel />
          </section>
        </div>
      </article>
    </>
  );
}

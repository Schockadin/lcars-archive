import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import MarkdownImportPanel from "./MarkdownImportPanel";

export const metadata: Metadata = {
  title: "Import",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

// Admin-only: Markdown-Datei-Upload (einzeln oder mehrere), aus denen nach
// individueller Bestätigung neue Archiv-Einträge/Missionen/Charaktere
// entstehen — siehe src/lib/markdownImport.ts.
export default async function AdminImportPage() {
  await requireAdmin();

  return (
    <>
      <PageMeta title="Import" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Import</h1>

        <MarkdownImportPanel />
      </article>
    </>
  );
}

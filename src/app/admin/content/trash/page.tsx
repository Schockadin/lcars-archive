import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { getDeletedContentForAdmin } from "@/lib/adminContent";
import TrashTable from "./TrashTable";

export const metadata: Metadata = {
  title: "Papierkorb",
  robots: { index: false, follow: false },
};

// Admin-only Papierkorb: alle weich gelöschten Inhalte (Charaktere/
// Missionen/Missionslogs/Archiv-Einträge/Dialoge, siehe deleted_at-Spalten
// in scripts/schema.sql), die für alle anderen bereits aus Suche/Timeline/
// Listen verschwunden sind — wiederherstellbar oder sofort endgültig
// löschbar, bis der tägliche Purge-Cronjob (scripts/purge-soft-deleted.ts)
// sie nach 7 Tagen automatisch entfernt.
export default async function AdminTrashPage() {
  await requireAdmin();

  const items = await getDeletedContentForAdmin();

  return (
    <>
      <PageMeta title="Papierkorb" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Papierkorb</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-text-dim text-[13px]">
            Gelöschte Inhalte bleiben hier 7 Tage lang sichtbar und
            wiederherstellbar, bevor sie automatisch endgültig entfernt werden.
            Nur für Admins sichtbar — in Suche, Timeline und allen übrigen
            Listen tauchen diese Inhalte nicht mehr auf.
          </p>
          <Link
            href="/admin/content"
            className="lcars-pill-btn--outline self-start max-sm:w-full max-sm:self-stretch"
          >
            Zur Inhaltsübersicht
          </Link>
          <TrashTable items={items} />
        </div>
      </article>
    </>
  );
}

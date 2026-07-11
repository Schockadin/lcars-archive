import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllContentForAdmin } from "@/lib/adminContent";
import AdminContentBrowser from "./AdminContentBrowser";

export const metadata: Metadata = {
  title: "Inhaltsübersicht",
  robots: { index: false, follow: false },
};

// Admin-only Übersicht ALLER Inhalte (nicht nur eigene, siehe /user/content
// für das Selbstbedienungs-Gegenstück) — filter-/gruppierbar nach Owner und
// Kategorie, mit Einzel- (OwnerSelect) und Mass-Edit-Owner-Zuordnung
// (Checkboxen + bulkSetContentOwnerAction). Verlinkt aus der
// "Admin Actions"-Sektion in /admin (page.tsx).
export default async function AdminContentPage() {
  await requireAdmin();

  const [items, users] = await Promise.all([
    getAllContentForAdmin(),
    listAllUsers(),
  ]);
  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageMeta title="Inhaltsübersicht" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Inhaltsübersicht</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <AdminContentBrowser items={items} users={userOptions} />
        </div>
      </article>
    </>
  );
}

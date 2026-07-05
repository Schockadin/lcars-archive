import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession } from "@/lib/dal";
import { getOwnArchiveEntryForEdit } from "@/lib/archive";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import EditArchiveEntryForm from "./EditArchiveEntryForm";

export const metadata: Metadata = {
  title: "Archiv-Eintrag bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditArchiveEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  const session = await verifySession();

  const userId = Number(id);
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const entry = await getOwnArchiveEntryForEdit(
    session.userId,
    Number(entryId),
  );
  if (!entry) {
    redirect(`/users/${session.userId}/content`);
  }

  return (
    <>
      <PageMeta title="Archiv-Eintrag bearbeiten" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Archiv-Eintrag bearbeiten</h1>
        <p className="lcars-text text-[13px] opacity-80">
          {CATEGORY_CONFIG[entry.category].label}
        </p>

        <EditArchiveEntryForm userId={userId} entry={entry} />
      </article>
    </>
  );
}

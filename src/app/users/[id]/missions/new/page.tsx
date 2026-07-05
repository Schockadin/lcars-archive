import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnGM } from "../../dal";
import { getMostRecentLogDate } from "@/lib/missions";
import NewMissionForm from "./NewMissionForm";

export const metadata: Metadata = {
  title: "Neue Mission",
  robots: { index: false, follow: false },
};

export default async function NewMissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireOwnGM(id);
  const defaultStartedAt = await getMostRecentLogDate();

  return (
    <>
      <PageMeta title="Neue Mission" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Neue Mission anlegen</h1>
        <NewMissionForm userId={user.id} defaultStartedAt={defaultStartedAt} />
      </article>
    </>
  );
}

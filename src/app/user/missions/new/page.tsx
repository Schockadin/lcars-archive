import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnGM } from "../../dal";
import { getMostRecentLogDate } from "@/lib/missions";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import NewMissionForm from "./NewMissionForm";

export const metadata: Metadata = {
  title: "Neue Mission",
  robots: { index: false, follow: false },
};

export default async function NewMissionPage() {
  const { user } = await requireOwnGM();
  const [defaultStartedAt, characters] = await Promise.all([
    getMostRecentLogDate(),
    getCharactersForParticipantPicker(),
  ]);

  return (
    <>
      <PageMeta title="Neue Mission" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Neue Mission anlegen</h1>
        <NewMissionForm
          userId={user.id}
          defaultStartedAt={defaultStartedAt}
          characters={characters}
        />
      </article>
    </>
  );
}

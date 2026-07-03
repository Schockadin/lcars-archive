import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../dal";
import { getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import UserContentBrowser from "./UserContentBrowser";

export const metadata: Metadata = {
  title: "Meine Inhalte",
  robots: { index: false, follow: false },
};

export default async function UserContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, characters } = await requireOwnCharacters(id);

  const [logs, dialogues] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
  ]);

  return (
    <>
      <PageMeta title="Meine Inhalte" section="users" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <h1>Meine Inhalte</h1>

        <div className="lcars-text">
          <UserContentBrowser
            characters={characters}
            logs={logs}
            dialogues={dialogues}
          />
        </div>
      </article>
    </>
  );
}

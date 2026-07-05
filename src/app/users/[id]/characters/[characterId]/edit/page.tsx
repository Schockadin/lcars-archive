import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession } from "@/lib/dal";
import { getOwnCharacterForEdit } from "@/lib/characters";
import { getUserById } from "@/lib/users";
import EditCharacterForm from "./EditCharacterForm";

export const metadata: Metadata = {
  title: "Charakter bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>;
}) {
  const { id, characterId } = await params;
  const session = await verifySession();

  const userId = Number(id);
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const [character, viewer] = await Promise.all([
    getOwnCharacterForEdit(session.userId, Number(characterId)),
    getUserById(session.userId),
  ]);
  if (!character) {
    redirect(`/users/${session.userId}/content`);
  }

  return (
    <>
      <PageMeta title="Charakter bearbeiten" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Charakter bearbeiten</h1>

        <EditCharacterForm
          userId={userId}
          character={character}
          isAdminOrGM={viewer?.role === "gm" || viewer?.role === "admin"}
        />
      </article>
    </>
  );
}

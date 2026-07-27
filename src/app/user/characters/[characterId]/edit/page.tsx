import { userCan } from "@/lib/permissions";
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
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = await params;
  const session = await verifySession();

  const [character, viewer] = await Promise.all([
    getOwnCharacterForEdit(session.userId, Number(characterId)),
    getUserById(session.userId),
  ]);
  if (!character) {
    redirect("/user/content");
  }

  return (
    <>
      <PageMeta title="Charakter bearbeiten" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Charakter bearbeiten</h1>

        <EditCharacterForm
          userId={session.userId}
          character={character}
          isAdminOrGM={!!viewer && userCan(viewer, "content.autolink_tools")}
        />
      </article>
    </>
  );
}

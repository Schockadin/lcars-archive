import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../dal";
import { getAllFollows } from "@/lib/follows";
import FollowList from "./FollowList";

export const metadata: Metadata = {
  title: "Follows",
  robots: { index: false, follow: false },
};

// Reine Selbstbedienung (requireOwnUser, wie /users/[id]/content) — Follows
// sind Privatsache, kein GM/Admin-Einblick in fremde Follows vorgesehen.
export default async function UserFollowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOwnUser(id);
  const follows = await getAllFollows(user.id);

  return (
    <>
      <PageMeta title="Follows" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Follows</h1>
        <p className="lcars-text mb-[16px]">
          Alles, was du gespeichert oder abonniert hast. Beende einzelne
          Follows über den jeweiligen Button.
        </p>
        <FollowList items={follows} />
      </article>
    </>
  );
}

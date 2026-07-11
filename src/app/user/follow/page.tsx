import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../dal";
import { getSubscribedContent } from "@/lib/follows";
import FollowList from "./FollowList";

export const metadata: Metadata = {
  title: "Follows",
  robots: { index: false, follow: false },
};

// Reine Selbstbedienung (requireOwnUser, wie /user/content) — Follows sind
// Privatsache, kein GM/Admin-Einblick in fremde Follows vorgesehen. Zeigt
// bewusst nur Abos, keine Lesezeichen (die leben auf dem Dashboard, siehe
// Dashboard.tsx) — Follows sind hier die Dinge, über die man benachrichtigt
// werden will, nicht bloß gespeicherte Inhalte.
export default async function UserFollowPage() {
  const user = await requireOwnUser();
  const follows = await getSubscribedContent(user.id);

  return (
    <>
      <PageMeta title="Follows" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Follows</h1>
        <p className="lcars-text mb-[16px]">
          Alles, was du abonniert hast. Beende einzelne Follows über den
          jeweiligen Button.
        </p>
        <FollowList items={follows} />
      </article>
    </>
  );
}

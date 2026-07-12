import { notFound } from "next/navigation";
import { getAuthorLogNav, getLogBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import { getViewer, canView } from "@/lib/visibility";
import { listAllUsers } from "@/lib/users";
import LogDetail from "../../LogDetail";
import ActionsMenu from "@/components/ActionsMenu";

interface Props {
  params: Promise<{ missionSlug: string; logSlug: string }>;
}

// Erzwungen dynamisch — siehe src/app/characters/[slug]/page.tsx: der
// Sichtbarkeits-Guard unten braucht cookies(), was mit
// generateStaticParams auf dieser Route sonst zu DYNAMIC_SERVER_USAGE führt.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { missionSlug, logSlug } = await params;
  const log = await getLogBySlug(logSlug);
  if (!log || log.mission_slug !== missionSlug) {
    return { title: "Nicht gefunden" };
  }
  const visible =
    log.visibility === "public" ||
    canView(log.visibility, log.ownerUserId, await getViewer());
  if (!visible) return { title: "Nicht gefunden" };

  return {
    title: `${log.title} · ${log.mission_title}`,
    description: stripHtml(log.content).slice(0, 160) || undefined,
  };
}

export default async function LogPage({ params }: Props) {
  const { missionSlug, logSlug } = await params;
  const log = await getLogBySlug(logSlug);

  // Log muss existieren UND zur Mission im Pfad gehören (sonst 404).
  if (!log || log.mission_slug !== missionSlug) notFound();

  // Betrachter jetzt immer auflösen (nicht mehr nur bei nicht-public) — der
  // Admin-Owner-Block unten braucht die Rolle unabhängig von der
  // Sichtbarkeit dieses Logs.
  const viewer = await getViewer();
  if (
    log.visibility !== "public" &&
    !canView(log.visibility, log.ownerUserId, viewer)
  ) {
    notFound();
  }

  // Vor-/Zurück-Navigation zwischen Logs desselben Autors (sofern Autor bekannt).
  const nav = log.author_slug
    ? await getAuthorLogNav(log.author_slug, log.slug)
    : { prev: null, next: null };
  const allUsers = viewer?.role === "admin" ? await listAllUsers() : [];
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <ActionsMenu
        viewer={viewer}
        owners={owners}
        content={log}
        contentType="missionLog"
        playerId={log.ownerUserId}
      />
      <LogDetail log={log} nav={nav} />
    </>
  );
}

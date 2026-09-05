import { notFound } from "next/navigation";
import { getAuthorLogNav, getLogBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import {
  getViewer,
  canView,
  canViewDraft,
  viewerHasPermission,
} from "@/lib/visibility";
import { listAllUsers } from "@/lib/users";
import LogDetail from "../../LogDetail";
import ActionsMenu from "@/components/ActionsMenu";
import { getMentionsOf } from "@/lib/mentions";
import MentionsSection from "@/app/_shared/MentionsSection";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
import { listNotes } from "@/lib/contentNotes";
import NotesPanel from "@/app/_shared/NotesPanel";

interface Props {
  params: Promise<{ missionSlug: string; logSlug: string }>;
}


export async function generateMetadata({ params }: Props) {
  const { missionSlug, logSlug } = await params;
  const log = await getLogBySlug(logSlug);
  if (!log || log.mission_slug !== missionSlug) {
    return { title: "Nicht gefunden" };
  }
  const viewerForMeta = await getViewer();
  const visible =
    (log.visibility === "public" ||
      canView(log.visibility, log.ownerUserId, viewerForMeta)) &&
    canViewDraft(log.isDraft, log.ownerUserId, viewerForMeta);
  if (!visible) return { title: "Nicht gefunden" };

  return {
    title: `${log.title} · ${log.mission_title}`,
    description: stripHtml(log.content).slice(0, 160) || undefined,
  };
}

export default async function LogPage({ params }: Props) {
  const { missionSlug, logSlug } = await params;
  // Log und Betrachter parallel laden (getViewer liest nur die Session, nicht
  // den Log). Betrachter immer auflösen — der Owner-Block unten braucht die
  // Rechte unabhängig von der Sichtbarkeit dieses Logs.
  const [log, viewer] = await Promise.all([getLogBySlug(logSlug), getViewer()]);

  // Log muss existieren UND zur Mission im Pfad gehören (sonst 404).
  if (!log || log.mission_slug !== missionSlug) notFound();
  if (
    log.visibility !== "public" &&
    !canView(log.visibility, log.ownerUserId, viewer)
  ) {
    notFound();
  }
  if (!canViewDraft(log.isDraft, log.ownerUserId, viewer)) notFound();

  // Autor-Navigation und Owner-Auswahl sind voneinander unabhängig — parallel
  // laden statt nacheinander. nav: Vor-/Zurück zwischen Logs desselben Autors
  // (sofern Autor bekannt). owners: nur laden, wenn der Betrachter den Log
  // umtragen darf — exakt das Server-Gate von setOwnerAction für Mission-Logs
  // (content.moderate), rechte- statt rollenbasiert (früher role === "admin").
  const [nav, allUsers, mentions, notes] = await Promise.all([
    log.author_slug
      ? getAuthorLogNav(log.author_slug, log.slug)
      : Promise.resolve({ prev: null, next: null }),
    viewerHasPermission(viewer, "content.moderate")
      ? listAllUsers()
      : Promise.resolve([]),
    // Wer verweist auf dieses Logbuch? (Wikilinks in anderen Texten)
    getMentionsOf({ slug: log.slug, name: log.title }, viewer),
    listNotes("mission_log", log.slug, viewer),
  ]);
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <MarkNewsSeen type="mission_log" slug={log.slug} />
      <ActionsMenu
        viewer={viewer}
        owners={owners}
        content={log}
        contentType="missionLog"
        playerId={log.ownerUserId}
      />
      <LogDetail log={log} nav={nav} />
      <div className="lcars-text lcars-wide-column mt-[16px] flex flex-col gap-[16px]">
        {viewer && (
          <NotesPanel
            contentType="mission_log"
            contentSlug={log.slug}
            path={`/missions/${missionSlug}/${log.slug}`}
            notes={notes}
          />
        )}
        <MentionsSection mentions={mentions} />
      </div>
    </>
  );
}

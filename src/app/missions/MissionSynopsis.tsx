import { MissionDetail } from "@/types/missions";
import { STATUS_CONFIG, periodLabel } from "@/lib/missionFormat";
import FollowButtons from "@/components/FollowButtons";
import { Viewer } from "@/lib/visibility";
import OwnerSelect from "@/components/OwnerSelect";
import AdminActionsMenu from "@/components/AdminActionsMenu";
import AutolinkButton from "@/components/AutolinkButton";
import RemoveWikilinksButton from "@/components/RemoveWikilinksButton";
import FormatTextButton from "@/components/FormatTextButton";
import { UserWithCharacters } from "@/lib/users";
import MissionSynopsisEditor from "./MissionSynopsisEditor";

// Rechte Spalte der Mission-Detailseite: Synopsis + Metadaten.
export default function MissionSynopsis({
  mission,
  viewer,
  owners,
}: {
  mission: MissionDetail;
  viewer: Viewer | null;
  owners: UserWithCharacters[];
}) {
  const cfg = STATUS_CONFIG[mission.status];

  return (
    <article className="mission-detail-article">
      <header
        className="mission-detail-header"
        style={{ "--mission-color": cfg.color } as React.CSSProperties}
      >
        <h1 className="mission-detail-title">{mission.title}</h1>
        <div className="lcars-meta-row">
          <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
        </div>
      </header>

      {viewer?.role === "admin" || viewer?.role === "gm" ? (
        <MissionSynopsisEditor
          missionId={mission.id}
          bodyHtml={mission.metadata.body}
          sourceMarkdown={mission.sourceMarkdown ?? ""}
          topRow={
            <>
              <FollowButtons targetType="mission" targetSlug={mission.slug} />
              {viewer?.role === "admin" && (
                <>
                  <OwnerSelect
                    contentType="mission"
                    id={mission.id}
                    initialOwnerId={mission.ownerUserId}
                    users={owners.map((u) => ({ id: u.id, name: u.name }))}
                  />
                  <AdminActionsMenu>
                    <AutolinkButton contentType="mission" slug={mission.slug} />
                    <RemoveWikilinksButton
                      contentType="mission"
                      slug={mission.slug}
                    />
                    <FormatTextButton
                      contentType="mission"
                      slug={mission.slug}
                    />
                  </AdminActionsMenu>
                </>
              )}
            </>
          }
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-[10px]">
            <FollowButtons targetType="mission" targetSlug={mission.slug} />
          </div>

          {mission.metadata.body ? (
            <div
              className="mission-body lcars-text"
              dangerouslySetInnerHTML={{ __html: mission.metadata.body }}
            />
          ) : (
            <p className="lcars-empty-state">Keine Zusammenfassung vorhanden</p>
          )}
        </>
      )}
    </article>
  );
}

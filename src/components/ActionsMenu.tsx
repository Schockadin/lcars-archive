"use client";
import Link from "next/link";
import { Viewer } from "@/lib/visibility";
import { UserWithCharacters } from "@/lib/users";
import { Character } from "@/types/character";
import OwnerSelect from "./OwnerSelect";
import AdminVisibilitySelect from "./AdminVisibilitySelect";
import AutolinkButton from "@/components/AutolinkButton";
import RemoveWikilinksButton from "@/components/RemoveWikilinksButton";
import { ContentToolType } from "@/app/actions/contentTools";
import { PencilIcon } from "@/lib/icons";
import FollowButtons from "./FollowButtons";
import { MissionDetail, MissionLogDetail } from "@/types/missions";
import { ArchiveEntryDetail } from "@/types/archive";
import { FollowTargetType } from "@/lib/follows";
import type { OwnerContentType } from "@/app/actions/owner";
import type { AdminVisibilityContentType } from "@/app/actions/visibility";

// ContentToolType (Autolink/Wikilinks/Format-Buttons) und OwnerContentType
// (setOwnerAction) heißen für Mission-Log/Archiv-Eintrag unterschiedlich
// ("missionLog"/"archiveEntry" vs. "mission_log"/"archive_entry") — diese
// Zuordnung war vorher fest auf "character" verdrahtet, wodurch OwnerSelect
// auf jeder Nicht-Charakter-Seite (Mission, Mission-Log, Archiv-Eintrag)
// versehentlich den Owner eines völlig anderen Charakters (per zufällig
// gleicher ID) statt den tatsächlichen Inhalt umgehängt hat.
const OWNER_CONTENT_TYPE: Record<ContentToolType, OwnerContentType> = {
  character: "character",
  mission: "mission",
  missionLog: "mission_log",
  archiveEntry: "archive_entry",
};

// Wie OWNER_CONTENT_TYPE oben, aber ohne "mission" — Missionen haben keine
// visibility-Spalte (immer öffentlich, siehe lib/missions.ts), AdminVisibilitySelect
// wird für contentType "mission" deshalb gar nicht gerendert.
const VISIBILITY_CONTENT_TYPE: Partial<
  Record<ContentToolType, AdminVisibilityContentType>
> = {
  character: "character",
  missionLog: "mission_log",
  archiveEntry: "archive_entry",
};

interface ActionMenuProps {
  viewer: Viewer | null;
  owners: UserWithCharacters[];
  content: Character | MissionDetail | MissionLogDetail | ArchiveEntryDetail;
  contentType: ContentToolType;
  // Optional: Mission-Logs sind nicht followbar (siehe FollowTargetType in
  // lib/follows.ts) — die Mission-Log-Detailseite übergibt deshalb gar
  // keinen followType, statt ihn auf einen ungültigen Wert zu zwingen.
  followType?: FollowTargetType;
  playerId: number | null;
  // Optional statt required: Server Components (z.B. der Dialog-Zweig in
  // archive/[slug]/page.tsx oder die Mission-Log-Detailseite) rendern
  // ActionsMenu direkt, ohne dass dort ein Editor existiert, der editMode
  // liest — und dürfen als Server Component keine Inline-Funktion als Prop
  // übergeben. Der No-op-Default lebt deshalb hier in der Client Component
  // selbst statt von außen durchgereicht zu werden.
  onEdit?: () => void;
}

export default function ActionsMenu({
  viewer,
  owners,
  content,
  contentType,
  followType,
  playerId,
  onEdit = () => {},
}: ActionMenuProps) {
  const visibilityContentType = VISIBILITY_CONTENT_TYPE[contentType];

  return (
    <div className="flex flex-col items-start justify-center gap-[8px]">
      {(viewer?.role === "admin" || viewer?.role === "gm") && (
        <OwnerSelect
          contentType={OWNER_CONTENT_TYPE[contentType]}
          id={content.id}
          initialOwnerId={playerId}
          users={owners.map((u) => ({ id: u.id, name: u.name }))}
        />
      )}
      {viewer?.role === "admin" && visibilityContentType && "visibility" in content && (
        <AdminVisibilitySelect
          contentType={visibilityContentType}
          id={content.id}
          initialValue={content.visibility}
        />
      )}
      <div className="flex gap-[8px]">
        {(viewer?.role === "gm" || viewer?.role === "admin") && (
          <div className="flex gap-[8px]">
            <AutolinkButton contentType={contentType} slug={content.slug} />
            <RemoveWikilinksButton
              contentType={contentType}
              slug={content.slug}
            />
          </div>
        )}
        {viewer?.role && followType && (
          <FollowButtons targetType={followType} targetSlug={content.slug} />
        )}
        {/* "character" ist hier wie "missionLog" ausgeschlossen: der
            Bio-Editor ist bewusst reines Owner-Feature ohne Admin-Konzept
            (siehe CharacterBioEditor.tsx) — sourceMarkdown wird serverseitig
            nur für den Owner geladen, ein Admin-Klick würde sonst ins Leere
            laufen. */}
        {((contentType !== "missionLog" &&
          contentType !== "character" &&
          viewer?.role === "admin") ||
          viewer?.userId === playerId) &&
          (contentType === "missionLog" ? (
            // Mission-Logs haben (anders als Charakter/Mission/Archiv-Eintrag)
            // keinen Inline-Editor auf der Detailseite — die Mission-Log-
            // Detailseite übergibt deshalb auch gar kein onEdit (bliebe sonst
            // der No-op-Default). Bearbeiten passiert stattdessen auf der
            // eigenen Formular-Seite, wie auch in UserContentBrowser.tsx.
            <Link
              href={`/user/mission-logs/${content.id}/edit`}
              className="lcars-icon-btn self-start"
              aria-label="Bearbeiten"
              title="Bearbeiten"
            >
              <PencilIcon />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="lcars-icon-btn self-start"
              aria-label="Bearbeiten"
              title="Bearbeiten"
            >
              <PencilIcon />
            </button>
          ))}
      </div>
    </div>
  );
}

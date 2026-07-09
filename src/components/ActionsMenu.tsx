"use client";
import { Viewer } from "@/lib/visibility";
import { UserWithCharacters } from "@/lib/users";
import { Character } from "@/types/character";
import OwnerSelect from "./OwnerSelect";
import AutolinkButton from "@/components/AutolinkButton";
import RemoveWikilinksButton from "@/components/RemoveWikilinksButton";
import FormatTextButton from "@/components/FormatTextButton";
import { ContentToolType } from "@/app/actions/contentTools";
import { PencilIcon } from "@/lib/icons";
import FollowButtons from "./FollowButtons";
import { MissionDetail, MissionLogDetail } from "@/types/missions";
import { ArchiveEntryDetail } from "@/types/archive";
import { FollowTargetType } from "@/lib/follows";
import { useEdit } from "@/hooks/useEdit";

interface ActionMenuProps {
  viewer: Viewer | null;
  owners: UserWithCharacters[];
  content: Character | MissionDetail | MissionLogDetail | ArchiveEntryDetail;
  contentType: ContentToolType;
  followType: FollowTargetType;
  playerId: number | null;
}

export default function ActionsMenu({
  viewer,
  owners,
  content,
  contentType,
  followType,
  playerId,
}: ActionMenuProps) {
  const { setEditMode } = useEdit();

  return (
    <div className="flex flex-col items-start justify-center gap-[8px]">
      {(viewer?.role === "admin" || viewer?.role === "gm") && (
        <OwnerSelect
          contentType="character"
          id={content.id}
          initialOwnerId={playerId}
          users={owners.map((u) => ({ id: u.id, name: u.name }))}
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
            <FormatTextButton contentType={contentType} slug={content.slug} />
          </div>
        )}
        {viewer?.role && (
          <FollowButtons targetType={followType} targetSlug={content.slug} />
        )}
        {((contentType !== "missionLog" && viewer?.role === "admin") ||
          viewer?.userId === playerId) && (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className={`lcars-icon-btn self-start`}
            aria-label="Bearbeiten"
            title="Bearbeiten"
          >
            <PencilIcon />
          </button>
        )}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { Viewer } from "@/lib/visibility";
import { Character } from "@/types/character";
import OwnerSelect from "./OwnerSelect";
import AdminVisibilitySelect from "./AdminVisibilitySelect";
import ContentLinkToolButton from "@/components/ContentLinkToolButton";
import DeleteContentButton from "@/components/DeleteContentButton";
import ContentImageGallery from "@/components/ContentImageGallery";
import { ContentToolType } from "@/app/actions/contentTools";
import type { ContentImageType } from "@/lib/contentImages";
import { PencilIcon } from "@/lib/icons";
import FollowButtons from "./FollowButtons";
import ShareMenu from "./ShareMenu";
import { MissionDetail, MissionLogDetail } from "@/types/missions";
import { ArchiveEntryDetail } from "@/types/archive";
import { FollowTargetType } from "@/lib/follows";
import type { OwnerContentType } from "@/app/actions/owner";
import type { TrashContentType } from "@/lib/adminContent";
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

// ContentImageType (src/lib/contentImages.ts) nutzt dieselben DB-Namen wie
// OwnerContentType (mission_log/archive_entry statt missionLog/archiveEntry)
// — identisches Mapping, eigene Konstante nur wegen des eigenen Typs.
const IMAGE_CONTENT_TYPE: Record<ContentToolType, ContentImageType> = {
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
  owners: { id: number; name: string }[];
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
  // Abgeschlossene Dialoge (archive/[slug]/ArchiveEntryBody.tsx) bleiben
  // vollständig read-only, auch für den ursprünglichen Autor (siehe
  // DialogueThread.tsx) — dafür gibt es keinen Inline-Editor, der onEdit
  // liest, der Bearbeiten-Button wäre dort also nur eine tote Schaltfläche.
  hideEdit?: boolean;
}

export default function ActionsMenu({
  viewer,
  owners,
  content,
  contentType,
  followType,
  playerId,
  onEdit = () => {},
  hideEdit = false,
}: ActionMenuProps) {
  const visibilityContentType = VISIBILITY_CONTENT_TYPE[contentType];

  // Dialoge (category "dialogue") haben kein source_md (Inhalt lebt in
  // dialogue_messages) — Autolinking und Wikilinks-Entfernen liefen hier
  // bisher ins Leere ("Eintrag nicht gefunden"), siehe
  // getArchiveEntrySourceBySlug in src/lib/archive.ts. Owner-Zuweisung
  // funktioniert für Dialoge dagegen bewusst (Owner = wer den Dialog
  // gestartet hat, admin-only wie bei jedem anderen Inhaltstyp — der Server
  // setOwnerAction lehnt GM ohnehin schon ab, siehe src/app/actions/owner.ts).
  const isDialogue =
    contentType === "archiveEntry" && "category" in content && content.category === "dialogue";

  // Wer darf diesen Inhalt bearbeiten? Bei Mission/Archiv-Eintrag jeder
  // Admin, bei Missionslog/Charakter ausschließlich der Owner selbst (kein
  // Admin-Bypass, siehe updateOwnCharacterBioAction). Sowohl für den
  // Bearbeiten-Button unten als auch für die Bilder-Galerie genutzt (wer
  // bearbeiten darf, darf auch Bilder hochladen/löschen).
  const canManageContent =
    (contentType !== "missionLog" &&
      contentType !== "character" &&
      viewer?.role === "admin") ||
    viewer?.userId === playerId;

  // Für den WhatsApp-Teilen-Text im ShareMenu (siehe FollowButtons.tsx) —
  // Character hat "name" statt "title" wie die übrigen drei Inhaltstypen.
  const contentTitle = "title" in content ? content.title : content.name;

  // Löschen-Knopf (DeleteContentButton, admin-only) — trashContentType weicht
  // von OWNER_CONTENT_TYPE für Dialoge ab (eigener Löschpfad, siehe
  // deleteContentAction), redirectTo führt nach dem Löschen auf eine
  // sinnvolle Übersichtsseite, da die aktuelle Detailseite sonst mit einem
  // Notfound-Flackern enden würde.
  const trashContentType: TrashContentType = isDialogue
    ? "dialogue"
    : OWNER_CONTENT_TYPE[contentType];
  const deleteRedirectTo = isDialogue
    ? "/archive?cat=dialogue"
    : contentType === "character"
      ? "/characters"
      : contentType === "mission"
        ? "/missions"
        : contentType === "missionLog" && "mission_slug" in content
          ? `/missions/${content.mission_slug}`
          : "/archive";

  return (
    <div className="flex flex-col items-start justify-center gap-[5px]">
      {(viewer?.role === "admin" || viewer?.role === "gm") && (
        <OwnerSelect
          contentType={OWNER_CONTENT_TYPE[contentType]}
          id={content.id}
          initialOwnerId={playerId}
          users={owners}
        />
      )}
      {viewer?.role === "admin" && visibilityContentType && "visibility" in content && (
        <AdminVisibilitySelect
          contentType={visibilityContentType}
          id={content.id}
          initialValue={content.visibility}
        />
      )}
      <div className="flex gap-[5px]">
        {(viewer?.role === "gm" || viewer?.role === "admin") && !isDialogue && (
          <ContentLinkToolButton
            contentType={contentType}
            slug={content.slug}
          />
        )}
        {viewer?.role && followType && (
          <FollowButtons
            targetType={followType}
            targetSlug={content.slug}
            title={contentTitle}
          />
        )}
        {/* Missionslogs sind nicht followbar (kein FollowTargetType dafür,
            siehe lib/follows.ts), bekommen aber trotzdem Teilen/Export —
            eigenständiges ShareMenu statt über FollowButtons. */}
        {viewer?.role && contentType === "missionLog" && (
          <ShareMenu
            title={contentTitle}
            exportType="mission_log"
            exportSlug={content.slug}
          />
        )}
        {/* "character" ist hier wie "missionLog" ausgeschlossen: der
            Bio-Editor ist bewusst reines Owner-Feature ohne Admin-Konzept
            (siehe CharacterBioEditor.tsx) — sourceMarkdown wird serverseitig
            nur für den Owner geladen, ein Admin-Klick würde sonst ins Leere
            laufen. */}
        {!isDialogue && (
          <ContentImageGallery
            contentType={IMAGE_CONTENT_TYPE[contentType]}
            contentId={content.id}
            canManage={canManageContent}
          />
        )}
        {!hideEdit &&
          canManageContent &&
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
        {viewer?.role === "admin" && (
          <DeleteContentButton
            contentType={trashContentType}
            id={content.id}
            redirectTo={deleteRedirectTo}
          />
        )}
      </div>
    </div>
  );
}

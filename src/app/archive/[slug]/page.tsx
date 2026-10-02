import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { stripHtml } from "@/lib/missionFormat";
import { ArchiveEntryDetail, ArchiveLink } from "@/types/archive";
import PageMeta from "@/components/PageMeta";
import { LcarsReadingModeToggle } from "@/components/lcars";
import { getViewer, canView, viewerHasPermission } from "@/lib/visibility";
import { getDialogueViewPreference, listAllUsers } from "@/lib/users";
import { resolveFollowState } from "@/lib/follows";
import ArchiveEntryBody from "./ArchiveEntryBody";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
import { listNotes } from "@/lib/contentNotes";
import { ARCHIVE_REFERENCES_ID } from "@/lib/archiveToc";
import NotesPanel from "@/app/_shared/NotesPanel";
import { addStoredContentLinkPreviews } from "@/lib/autolink";
import { getDialogueMessages } from "@/lib/dialogues";
import DialogueHeader from "@/components/DialogueHeader";
import DialogueContentView from "@/app/characters/dialogues/[slug]/DialogueContentView";
import DeleteDialogueButton from "@/components/DeleteDialogueButton";
import ShareMenu from "@/components/ShareMenu";
import { PencilIcon } from "@/lib/icons";
import {
  archiveHref,
  archiveListHref,
  characterHref,
  dialogueHref,
  dialoguesHref,
  missionHref,
} from "@/lib/contentRoutes";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry) return { title: "Nicht gefunden · Neo Archive" };

  // Offene Gespräche: Zugriff wird auf /dialogues/<slug> per Teilnehmer-Check
  // entschieden, nicht hier über owner_user_id — Metadaten dafür also nicht
  // zusätzlich blocken.
  const viewerForMeta = await getViewer();
  const visible =
    (entry.category === "dialogue" && entry.dialogue_open) ||
    canView(entry.isDraft, entry.ownerUserId, viewerForMeta);
  if (!visible) return { title: "Nicht gefunden · Neo Archive" };

  const desc = entry.metadata.summary ?? stripHtml(entry.content);
  const section = entry.category === "dialogue" ? "Gespräche" : "Datenbank";
  return {
    title: `${archiveTitle(entry)} · ${section} · Neo Archive`,
    description: desc.slice(0, 160) || undefined,
  };
}

export default async function ArchiveEntryPage({ params }: Props) {
  const { slug } = await params;
  // Eintrag und Betrachter parallel laden (getViewer liest nur die Session,
  // nicht den Eintrag). Betrachter immer auflösen — der Admin-Owner-Block
  // unten braucht die Rolle unabhängig von der Sichtbarkeit dieses Eintrags.
  const [entry, viewer] = await Promise.all([
    getArchiveEntryBySlug(slug),
    getViewer(),
  ]);
  if (!entry) notFound();

  // Offene Gespräche benötigen den Teilnehmer-Check ihrer Spielansicht.
  // Abgeschlossene Gespräche bleiben direkt unter /archive/<slug>, ihrer
  // kanonischen Leseseite.
  if (entry.category === "dialogue" && entry.dialogue_open) {
    redirect(dialogueHref(entry.slug));
  }

  if (!canView(entry.isDraft, entry.ownerUserId, viewer)) notFound();
  const entryWithLinkPreviews = {
    ...entry,
    content: await addStoredContentLinkPreviews(entry.content ?? ""),
  };

  // Verwaltungsdaten nur für normale Archiv-Einträge laden. Abgeschlossene
  // Gespräche verwenden ihre eigenen Moderationsrechte und Aktionen.
  const [
    allUsers,
    followInitialState,
    notes,
    messages,
    flowingTextPreferred,
  ] = await Promise.all([
    entry.category !== "dialogue" &&
    viewerHasPermission(viewer, "content.moderate")
      ? listAllUsers()
      : Promise.resolve([]),
    // Bookmark/Abo-Stand serverseitig vorlösen — an ArchiveEntryBody →
    // ActionsMenu → FollowButtons als initialState durchgereicht, damit die
    // Buttons sofort mitgerendert werden statt per Client-Fetch nachzuladen.
    entry.category === "dialogue"
      ? Promise.resolve(undefined)
      : resolveFollowState(viewer?.userId ?? null, "archive_entry", slug),
    // Notizen/Kommentare am Eintrag — nur für eingeloggte Personen.
    listNotes("archive", entry.slug, viewer),
    entry.category === "dialogue"
      ? getDialogueMessages(entry.id)
      : Promise.resolve([]),
    entry.category === "dialogue" && viewer
      ? getDialogueViewPreference(viewer.userId)
      : Promise.resolve(true),
  ]);
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  const cfg = CATEGORY_CONFIG[entry.category];
  const title = archiveTitle(entry);
  const canModerateDialogue = viewerHasPermission(viewer, "dialogues.moderate");

  return (
    <article
      className="archive-entry"
      style={{ "--cat-color": cfg.color } as React.CSSProperties}
    >
      <PageMeta title={title} section="archive" />
      <MarkNewsSeen type="archive_entry" slug={entry.slug} />

      {/* Zurück in die Liste, aus der der Eintrag stammt — auf seine
          Kategorie vorgefiltert, wie „‹ Missionen" auf der Missionsseite und
          „‹ <Mission>" am Logbuch. Darunter der Lesemodus-Schalter (nur
          mobil sichtbar), beide linksbündig gestapelt. */}
      <div className="flex flex-col items-start gap-[8px]">
        <Link
          href={
            entry.category === "dialogue"
              ? dialoguesHref()
              : archiveListHref(entry.category)
          }
          className="lcars-back-link"
        >
          ‹ {entry.category === "dialogue" ? "Gespräche" : cfg.plural}
        </Link>
        <LcarsReadingModeToggle />
      </div>

      <div className="flex items-start">
        {entry.category === "dialogue" ? (
          <DialogueHeader
            title={title}
            participants={entry.metadata.participants}
            location={entry.metadata.location}
            logDate={entry.metadata.logDate}
          />
        ) : (
          <StandardHeader entry={entry} title={title} label={cfg.label} />
        )}
      </div>

      {entry.category === "dialogue" ? (
        <DialogueContentView
          entry={entryWithLinkPreviews}
          viewer={viewer}
          messages={messages}
          flowingTextPreferred={flowingTextPreferred}
          canModerate={canModerateDialogue}
        />
      ) : (
        <ArchiveEntryBody
          entry={entryWithLinkPreviews}
          viewer={viewer}
          owners={owners}
          messages={[]}
          flowingTextPreferred={true}
          followInitialState={followInitialState}
        />
      )}

      {entry.category === "dialogue" && (
        <div className="mt-[16px] flex flex-wrap items-center gap-[8px]">
          <ShareMenu
            title={title}
            exportType="archive_entry"
            exportSlug={entry.slug}
          />
          {canModerateDialogue && (
            <>
              <Link
                href={`/gm/dialogues/${entry.slug}/edit`}
                className="lcars-icon-btn"
                aria-label="Metadaten bearbeiten"
                title="Metadaten bearbeiten"
              >
                <PencilIcon />
              </Link>
              <DeleteDialogueButton entrySlug={entry.slug} />
            </>
          )}
        </div>
      )}

      {viewer && (
        <NotesPanel
          contentType="archive"
          contentSlug={entry.slug}
          path={archiveHref(entry.slug)}
          notes={notes}
        />
      )}

      <div id={ARCHIVE_REFERENCES_ID}>
        <RelatedSection title="Verweise" links={entry.links} />
        <RelatedSection title="Erwähnt in" links={entry.backlinks} />

        <RefSection
          title="Charaktere"
          color={CONTENT_TYPE_COLOR.character}
          refs={entry.metadata.characters.map((c) => ({
            href: characterHref(c.slug),
            label: c.name,
          }))}
        />

        <RefSection
          title="Missionen"
          color={CONTENT_TYPE_COLOR.mission}
          refs={entry.metadata.missions.map((m) => ({
            href: missionHref(m.slug),
            label: m.title,
          }))}
        />
      </div>
    </article>
  );
}

function StandardHeader({
  title,
}: {
  entry: ArchiveEntryDetail;
  title: string;
  label: string;
}) {
  return (
    <header className="archive-entry-head">
      <h1 className="char-file-name text-left">{title}</h1>
    </header>
  );
}

// Verweise auf Charaktere/Missionen (eigene Tabellen, kein archive_links-Graph).
function RefSection({
  title,
  color,
  refs,
}: {
  title: string;
  color: string;
  refs: { href: string; label: string }[];
}) {
  if (refs.length === 0) return null;

  return (
    <section className="archive-related">
      <p className="mission-logs-sub">{title}</p>
      <div className="archive-related-grid">
        {refs.map((ref) => (
          <Link
            key={ref.href}
            href={ref.href}
            className="archive-chip"
            style={{ "--chip-color": color } as React.CSSProperties}
          >
            <span className="archive-chip-title">{ref.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedSection({
  title,
  links,
}: {
  title: string;
  links: ArchiveLink[];
}) {
  if (links.length === 0) return null;

  return (
    <section className="archive-related">
      <p className="mission-logs-sub">{title}</p>
      <div className="archive-related-grid">
        {links.map((link) => (
          <Link
            key={link.slug}
            href={archiveHref(link.slug)}
            className="archive-chip"
            style={
              {
                "--chip-color": CATEGORY_CONFIG[link.category].color,
              } as React.CSSProperties
            }
          >
            <span className="archive-chip-title">{link.title}</span>
            {link.label && (
              <span className="archive-chip-label">{link.label}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

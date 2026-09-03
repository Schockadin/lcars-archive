import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import { ArchiveEntryDetail, ArchiveLink } from "@/types/archive";
import PageMeta from "@/components/PageMeta";
import { LcarsReadingModeToggle } from "@/components/lcars";
import {
  getViewer,
  canView,
  canViewDraft,
  viewerHasPermission,
} from "@/lib/visibility";
import { listAllUsers } from "@/lib/users";
import { resolveFollowState } from "@/lib/follows";
import ArchiveEntryBody from "./ArchiveEntryBody";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry) return { title: "Nicht gefunden · Neo Archive" };

  // Offene Dialoge: Zugriff wird auf /dialogues/<slug> per Teilnehmer-Check
  // entschieden (siehe unten in der Page-Komponente), nicht hier über
  // owner_user_id — Metadaten dafür also nicht zusätzlich blocken.
  const viewerForMeta = await getViewer();
  const visible =
    (entry.visibility === "public" ||
      (entry.category === "dialogue" && entry.dialogue_open) ||
      canView(entry.visibility, entry.ownerUserId, viewerForMeta)) &&
    canViewDraft(entry.isDraft, entry.ownerUserId, viewerForMeta);
  if (!visible) return { title: "Nicht gefunden · Neo Archive" };

  const desc = entry.metadata.summary ?? stripHtml(entry.content);
  return {
    title: `${archiveTitle(entry)} · Datenbank · Neo Archive`,
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

  // Gespräche leben im Charaktere-Bereich, nicht in der generischen Datenbank-
  // Detailseite: abgeschlossene unter /characters/dialogues/<slug>
  // (Single-Content-Ansicht), offene unter /dialogues/<slug> (Formular,
  // Abschluss-Button, Teilnehmer-Gate). Muss VOR dem Sichtbarkeits-Guard
  // unten passieren — der Teilnehmer-Check auf /dialogues/<slug> ist die
  // richtige Zugriffsprüfung für ein offenes Gespräch (jeder Teilnehmer, nicht
  // nur der Ersteller); ein alter /archive/<slug>-Link bleibt so gültig und
  // leitet auf das neue Ziel weiter (das offene Gespräche selbst nach
  // /dialogues weiterreicht).
  if (entry.category === "dialogue") {
    redirect(`/characters/dialogues/${entry.slug}`);
  }

  if (
    entry.visibility !== "public" &&
    !canView(entry.visibility, entry.ownerUserId, viewer)
  ) {
    notFound();
  }
  if (!canViewDraft(entry.isDraft, entry.ownerUserId, viewer)) notFound();

  // Owner-Auswahl und Bookmark/Abo-Stand sind voneinander unabhängig —
  // parallel laden. Gespräche werden hier nicht mehr gerendert (sie leiten
  // oben nach /characters/dialogues um), daher keine Dialog-Nachrichten/
  // -Präferenz mehr.
  // - owners: nur laden, wenn der Betrachter den Eintrag umtragen darf — exakt
  //   das Server-Gate von setOwnerAction (content.moderate).
  const [allUsers, followInitialState] = await Promise.all([
    viewerHasPermission(viewer, "content.moderate")
      ? listAllUsers()
      : Promise.resolve([]),
    // Bookmark/Abo-Stand serverseitig vorlösen — an ArchiveEntryBody →
    // ActionsMenu → FollowButtons als initialState durchgereicht, damit die
    // Buttons sofort mitgerendert werden statt per Client-Fetch nachzuladen.
    resolveFollowState(viewer?.userId ?? null, "archive_entry", slug),
  ]);
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  const cfg = CATEGORY_CONFIG[entry.category];
  const title = archiveTitle(entry);

  return (
    <article
      className="archive-entry"
      style={{ "--cat-color": cfg.color } as React.CSSProperties}
    >
      <PageMeta title={title} section="archive" />
      <MarkNewsSeen type="archive_entry" slug={entry.slug} />
      <LcarsReadingModeToggle />

      <div className="flex items-start">
        <StandardHeader entry={entry} title={title} label={cfg.label} />
      </div>

      <ArchiveEntryBody
        entry={entry}
        viewer={viewer}
        owners={owners}
        messages={[]}
        flowingTextPreferred={true}
        followInitialState={followInitialState}
      />

      <RelatedSection title="Verweise" links={entry.links} />
      <RelatedSection title="Erwähnt in" links={entry.backlinks} />

      <RefSection
        title="Charaktere"
        color="var(--lcars-tertiary)"
        refs={entry.metadata.characters.map((c) => ({
          href: `/characters/${c.slug}`,
          label: c.name,
        }))}
      />

      <RefSection
        title="Missionen"
        color="var(--lcars-primary)"
        refs={entry.metadata.missions.map((m) => ({
          href: `/missions/${m.slug}`,
          label: m.title,
        }))}
      />
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
            href={`/archive/${link.slug}`}
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

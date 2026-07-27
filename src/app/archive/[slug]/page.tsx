import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import { ArchiveEntryDetail, ArchiveLink } from "@/types/archive";
import PageMeta from "@/components/PageMeta";
import { LcarsReadingModeToggle } from "@/components/lcars";
import DialogueHeader from "@/components/DialogueHeader";
import DeleteDialogueButton from "@/components/DeleteDialogueButton";
import { getDialogueMessages } from "@/lib/dialogues";
import { getViewer, canView, canViewDraft } from "@/lib/visibility";
import { listAllUsers, getDialogueViewPreference } from "@/lib/users";
import ArchiveEntryBody from "./ArchiveEntryBody";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";

interface Props {
  params: Promise<{ slug: string }>;
}

// Cache Components: force-dynamic entfällt (unzulässig). Der cookies()-lesende
// Sichtbarkeits-Guard läuft in einer Suspense-Insel; der Rest kann statische
// Shell werden (siehe unten).

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
    title: `${archiveTitle(entry)} · Archiv · Neo Archive`,
    description: desc.slice(0, 160) || undefined,
  };
}

export default async function ArchiveEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry) notFound();

  // Offene Dialoge leben unter /dialogues/<slug> (Formular, Abschluss-Button,
  // eigener Teilnehmer-Gate). Muss VOR dem Sichtbarkeits-Guard unten
  // passieren: der Teilnehmer-Check auf /dialogues/<slug> ist die richtige
  // Zugriffsprüfung für einen offenen Dialog (jeder Teilnehmer, nicht nur der
  // Ersteller/owner_user_id) — der Sichtbarkeits-Guard hier würde einen
  // Partner sonst schon hier aussperren, bevor er dorthin überhaupt
  // umgeleitet wird.
  if (entry.category === "dialogue" && entry.dialogue_open) {
    redirect(`/dialogues/${entry.slug}`);
  }

  // Betrachter jetzt immer auflösen (nicht mehr nur bei nicht-public) — der
  // Admin-Owner-Block unten braucht die Rolle unabhängig von der
  // Sichtbarkeit dieses Eintrags. Kein Effekt mehr auf statische
  // Vorrenderung (siehe `dynamic = "force-dynamic"` oben).
  const viewer = await getViewer();
  if (
    entry.visibility !== "public" &&
    !canView(entry.visibility, entry.ownerUserId, viewer)
  ) {
    notFound();
  }
  if (!canViewDraft(entry.isDraft, entry.ownerUserId, viewer)) notFound();
  const allUsers = viewer?.role === "admin" ? await listAllUsers() : [];
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  // Einfache, nicht gecachte Abfrage — Frische kommt über die Revalidation
  // der ganzen Seite nach jeder neuen Nachricht (siehe
  // src/app/actions/dialogues.ts), nicht über Query-Caching. Kein
  // cookies()/headers()-Zugriff hier — die statische Vorrenderung dieser
  // Seite bleibt dadurch erhalten.
  const messages =
    entry.category === "dialogue" ? await getDialogueMessages(entry.id) : [];

  // Globale Präferenz (siehe DialogueViewToggle.tsx) — nur für eingeloggte
  // Betrachter eines (an dieser Stelle immer bereits geschlossenen, siehe
  // Redirect oben) Dialogs relevant. Anonyme Betrachter/andere
  // Inhaltstypen bekommen den Default true, ohne extra DB-Zugriff.
  const flowingTextPreferred =
    entry.category === "dialogue" && viewer
      ? await getDialogueViewPreference(viewer.userId)
      : true;

  const cfg = CATEGORY_CONFIG[entry.category];
  const title = archiveTitle(entry);

  // Bei Dialogen erscheinen Teilnehmer + Ort schon im Header — aus den
  // "Verweisen" herausfiltern, übrige Referenzen (Fraktion, Objekt, …) bleiben.
  const outgoingLinks =
    entry.category === "dialogue"
      ? entry.links.filter((l) => l.label !== "Teilnehmer" && l.label !== "Ort")
      : entry.links;

  return (
    <article
      className="archive-entry"
      style={{ "--cat-color": cfg.color } as React.CSSProperties}
    >
      <PageMeta title={title} section="archive" />
      <MarkNewsSeen type="archive_entry" slug={entry.slug} />
      <LcarsReadingModeToggle />

      <div className="flex items-start">
        {entry.category !== "dialogue" ? (
          <StandardHeader entry={entry} title={title} label={cfg.label} />
        ) : (
          <DialogueHeader
            title={title}
            participants={entry.metadata.participants}
            location={entry.metadata.location}
            logDate={entry.metadata.logDate}
          />
        )}
      </div>

      <ArchiveEntryBody
        entry={entry}
        viewer={viewer}
        owners={owners}
        messages={messages}
        flowingTextPreferred={flowingTextPreferred}
      />

      {viewer?.role === "admin" && entry.category === "dialogue" && (
        <div className="flex flex-wrap items-center gap-[8px]">
          {/* Metadaten (Titel/Datum/Ort/Tags) bearbeiten — auch für
              abgeschlossene Gespräche, nicht der Gesprächsverlauf. */}
          <Link
            href={`/admin/dialogues/${entry.slug}/edit`}
            className="lcars-pill-btn--outline"
          >
            Metadaten bearbeiten
          </Link>
          <DeleteDialogueButton entrySlug={entry.slug} />
        </div>
      )}

      <RelatedSection title="Verweise" links={outgoingLinks} />
      <RelatedSection title="Erwähnt in" links={entry.backlinks} />

      {/* Bei Dialogen erscheinen die Charaktere bereits als Teilnehmer. */}
      {entry.category !== "dialogue" && (
        <RefSection
          title="Charaktere"
          color="var(--lcars-blue)"
          refs={entry.metadata.characters.map((c) => ({
            href: `/characters/${c.slug}`,
            label: c.name,
          }))}
        />
      )}

      <RefSection
        title="Missionen"
        color="var(--lcars-amber)"
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

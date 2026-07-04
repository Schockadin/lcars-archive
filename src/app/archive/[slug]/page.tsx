// src/app/archive/[slug]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import { ArchiveEntryDetail, ArchiveLink } from "@/types/archive";
import PageMeta from "@/components/PageMeta";
import CrumbLabel from "@/components/CrumbLabel";
import { LcarsReadingModeToggle } from "@/components/lcars";
import FollowButtons from "@/components/FollowButtons";
import DialogueThread from "@/components/DialogueThread";
import DialogueHeader from "@/components/DialogueHeader";
import { getDialogueMessages } from "@/lib/dialogues";
import { getViewer, canView } from "@/lib/visibility";

interface Props {
  params: Promise<{ slug: string }>;
}

// Erzwungen dynamisch statt statisch vorgerendert: der Sichtbarkeits-Guard
// unten braucht cookies() (via getViewer()), sobald ein Eintrag nicht public
// ist. Next weist bei bedingtem cookies()-Zugriff auf einer Route mit
// generateStaticParams einen DYNAMIC_SERVER_USAGE-Fehler zurück (production
// build) statt zuverlässig dynamisch zu rendern — deshalb hier explizit statt
// implizit, exakt wie schon in src/app/dialogues/[slug]/page.tsx. Kostet die
// statische Vorrenderung/ISR für ALLE (auch public) Archiv-Einträge.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry) return { title: "Nicht gefunden · Neo Archive" };

  // Offene Dialoge: Zugriff wird auf /dialogues/<slug> per Teilnehmer-Check
  // entschieden (siehe unten in der Page-Komponente), nicht hier über
  // owner_user_id — Metadaten dafür also nicht zusätzlich blocken.
  const visible =
    entry.visibility === "public" ||
    (entry.category === "dialogue" && entry.dialogue_open) ||
    canView(entry.visibility, entry.ownerUserId, await getViewer());
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

  // Nur bei nicht-public Sichtbarkeit überhaupt einen Betrachter auflösen —
  // spart den Session-/DB-Lookup im (häufigeren) public-Fall. Kein Effekt
  // mehr auf statische Vorrenderung (siehe `dynamic = "force-dynamic"` oben).
  if (entry.visibility !== "public") {
    const viewer = await getViewer();
    if (!canView(entry.visibility, entry.ownerUserId, viewer)) {
      notFound();
    }
  }

  // Einfache, nicht gecachte Abfrage — Frische kommt über die Revalidation
  // der ganzen Seite nach jeder neuen Nachricht (siehe
  // src/app/actions/dialogues.ts), nicht über Query-Caching. Kein
  // cookies()/headers()-Zugriff hier — die statische Vorrenderung dieser
  // Seite bleibt dadurch erhalten.
  const messages =
    entry.category === "dialogue" ? await getDialogueMessages(entry.id) : [];

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
      <CrumbLabel slug={entry.slug} label={title} />
      <LcarsReadingModeToggle />

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

      <FollowButtons targetType="archive_entry" targetSlug={entry.slug} />

      {entry.metadata.summary && entry.category != "dialogue" && (
        <p className="lcars-eyebrow mb-[5px]">{entry.metadata.summary}</p>
      )}

      {entry.category !== "dialogue" &&
        entry.metadata.attributes.length > 0 && (
          <div className="char-file-data archive-entry-attrs">
            {entry.metadata.attributes.map((attr) => (
              <div key={attr.label} className="char-file-field">
                <span className="char-file-field-label">{attr.label}:</span>{" "}
                <span className="char-file-field-value">{attr.value}</span>
              </div>
            ))}
          </div>
        )}

      {entry.category === "dialogue" && messages.length > 0 ? (
        <DialogueThread
          messages={messages}
          participants={entry.metadata.participants}
          currentUserId={null}
          dialogueOpen={false}
        />
      ) : entry.content ? (
        <div
          className="mission-body lcars-text"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
      ) : (
        <p className="lcars-empty-state">
          Kein Inhalt zu diesem Eintrag hinterlegt.
        </p>
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

// src/app/archive/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArchivePaths, getArchiveEntryBySlug } from "@/lib/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { fmtDate, stripHtml } from "@/lib/missionFormat";
import { ArchiveEntryDetail, ArchiveLink } from "@/types/archive";
import PageMeta from "@/components/PageMeta";
import CrumbLabel from "@/components/CrumbLabel";
import { LcarsReadingModeToggle } from "@/components/lcars";
import FollowButtons from "@/components/FollowButtons";

interface Props {
  params: Promise<{ slug: string }>;
}

// Bekannte Einträge zur Build-Zeit vorrendern; neue Slugs on-demand.
export async function generateStaticParams() {
  const paths = await getAllArchivePaths();
  return paths.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry) return { title: "Nicht gefunden · Neo Archive" };

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
        <DialogueHeader entry={entry} title={title} label={cfg.label} />
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

      {entry.content ? (
        <div
          className="mission-body lcars-text"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
      ) : (
        <p className="char-file-bio-empty">
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

// Dialog-Header: Titel "Gespräch auf [setting]", verlinkte Teilnehmer + Ort.
function DialogueHeader({
  entry,
  title,
}: {
  entry: ArchiveEntryDetail;
  title: string;
  label: string;
}) {
  const { participants, location, logDate } = entry.metadata;

  return (
    <header className="archive-entry-head">
      <h1 className="char-file-name text-left">{title}</h1>

      <div className="archive-dialogue-meta">
        {participants.length > 0 && (
          <div className="archive-dialogue-row">
            <span className="archive-dialogue-label">Teilnehmer</span>
            <div className="archive-related-grid">
              {participants.map((p) =>
                p.kind === "unknown" ? (
                  // Kein eigener Eintrag → nur Name, kein Link.
                  <span
                    key={p.slug}
                    className="archive-chip archive-chip-static"
                    style={
                      {
                        "--chip-color": "var(--lcars-text-dim)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="archive-chip-title">{p.name}</span>
                  </span>
                ) : (
                  <Link
                    key={p.slug}
                    href={
                      p.kind === "character"
                        ? `/characters/${p.slug}`
                        : `/archive/${p.slug}`
                    }
                    className="archive-chip"
                    style={
                      {
                        "--chip-color": "var(--lcars-blue)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="archive-chip-title">{p.name}</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        )}

        {location && (
          <div className="archive-dialogue-row">
            <span className="archive-dialogue-label">Ort</span>
            <Link
              href={`/archive/${location.slug}`}
              className="archive-chip"
              style={
                { "--chip-color": "var(--lcars-green)" } as React.CSSProperties
              }
            >
              <span className="archive-chip-title">{location.title}</span>
            </Link>
          </div>
        )}

        {logDate && (
          <div className="archive-dialogue-row">
            <span className="archive-dialogue-label">Datum</span>
            <span className="archive-dialogue-value">{fmtDate(logDate)}</span>
          </div>
        )}
      </div>
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

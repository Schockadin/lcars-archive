// src/app/archive/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArchivePaths, getArchiveEntryBySlug } from "@/lib/archive";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import { ArchiveLink } from "@/types/archive";
import PageMeta from "@/components/PageMeta";
import CrumbLabel from "@/components/CrumbLabel";

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
    title: `${entry.title} · Archiv · Neo Archive`,
    description: desc.slice(0, 160) || undefined,
  };
}

export default async function ArchiveEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry) notFound();

  const cfg = CATEGORY_CONFIG[entry.category];

  return (
    <article
      className="archive-entry"
      style={{ "--cat-color": cfg.color } as React.CSSProperties}
    >
      <PageMeta title={entry.title} section="archive" />
      <CrumbLabel slug={entry.slug} label={entry.title} />

      <Link href="/archive" className="character-back">
        ‹ Archiv
      </Link>

      <header className="archive-entry-head">
        <span className="archive-entry-badge">{cfg.label}</span>
        <h1 className="char-file-name">{entry.title}</h1>
        {entry.tags.length > 0 && (
          <div className="archive-entry-tags">
            {entry.tags.map((tag) => (
              <span key={tag} className="archive-entry-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {entry.metadata?.summary && (
        <p className="mission-detail-lead">{entry.metadata.summary}</p>
      )}

      {entry.metadata?.attributes?.length > 0 && (
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

      <RelatedSection title="Verweise" links={entry.links} />
      <RelatedSection title="Erwähnt in" links={entry.backlinks} />

      {entry.metadata.characters != undefined && (
        <RefSection
          title="Charaktere"
          color="var(--lcars-blue)"
          refs={entry.metadata.characters.map((c) => ({
            href: `/characters/${c.slug}`,
            label: c.name,
          }))}
        />
      )}

      {entry.metadata.characters != undefined && (
        <RefSection
          title="Missionen"
          color="var(--lcars-amber)"
          refs={entry.metadata.missions.map((m) => ({
            href: `/missions/${m.slug}`,
            label: m.title,
          }))}
        />
      )}
    </article>
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

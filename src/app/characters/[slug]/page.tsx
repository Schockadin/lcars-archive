// src/app/characters/[slug]/page.tsx
import { getDocument, getSlugs } from '@/lib/markdown';
import { CharacterFrontmatter } from '@/types/content';
import { renderMarkdown } from '@/lib/markdown-renderer';
import { DatapadLayout, MAIN_NAV } from '@/components/lcars';
import CharacterDetail from '@/components/lcars/CharacterDetail';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamicParams = false; // Nur vorgerenderte Slugs erlaubt

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getSlugs('characters');
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const doc = getDocument<CharacterFrontmatter>('characters', slug);
  return {
    title: `${doc?.frontmatter.name} | LCARS Archiv`,
    description: `${doc?.frontmatter.race} ${doc?.frontmatter.role}`,
  };
}

export default async function CharacterPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDocument<CharacterFrontmatter>('characters', slug);

  if (!doc) {
    notFound();
  }

  // Rendere den Markdown-Inhalt
  const htmlContent = await renderMarkdown(doc.content);

  const nav = MAIN_NAV.map(item =>
    item.href === '/characters' ? { ...item, active: true } : item
  );

  return (
    <DatapadLayout
      title={doc.frontmatter.name}
      nav={nav}
      statusLeft={`${doc.frontmatter.race} · ${doc.frontmatter.role}`}
      statusRight="CHARAKTERDATENBANK"
      sidebarAccent="var(--lcars-blue)"
    >
      {/* Zurück-Link */}
      <Link
        href="/characters"
        className="inline-block mb-6 lcars-pill lcars-pill-dim text-sm"
      >
        ← Zurück zum Register
      </Link>

      {/* Charakter-Details */}
      <CharacterDetail
        character={doc.frontmatter}
        htmlContent={htmlContent}
      />
    </DatapadLayout>
  );
}
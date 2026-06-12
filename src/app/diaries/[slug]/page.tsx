// src/app/diaries/[slug]/page.tsx
import { getDocument, getSlugs } from '@/lib/markdown';
import { DiaryFrontmatter } from '@/types/content';
import { renderMarkdown } from '@/lib/markdown-renderer';
import { DatapadLayout, MAIN_NAV } from '@/components/lcars';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DiaryDetail from '@/components/lcars/DiaryDetail';

export const dynamicParams = false;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getSlugs('diaries');
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const doc = getDocument<DiaryFrontmatter>('diaries', slug);
  return {
    title: `${doc?.frontmatter.title} | LCARS Archiv`,
    description: doc?.frontmatter.summary,
  };
}

export default async function DiaryPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDocument<DiaryFrontmatter>('diaries', slug);

  if (!doc) {
    notFound();
  }
  const diaryDate = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(doc.frontmatter.date));

  const htmlContent = await renderMarkdown(doc.content);

  const nav = MAIN_NAV.map(item =>
    item.href === '/sessions' 
      ? { label: item.label, href: '/diaries', active: item.active }
      : item.href === '/diaries'
      ? { ...item, active: true }
      : item
  );


  return (
    <DatapadLayout
      title={doc.frontmatter.title}
      nav={nav}
      statusLeft={doc.frontmatter.author ? `VON: ${doc.frontmatter.author}` : 'TAGEBUCHEINTRAG'}
      statusRight={diaryDate}
      sidebarAccent="var(--lcars-amber)"
    >
      <Link
        href="/diaries"
        className="inline-block mb-6 lcars-pill lcars-pill-dim text-sm"
      >
        ← Zurück zu Tagebüchern
      </Link>

      <DiaryDetail diary={doc.frontmatter} htmlContent={htmlContent} />
    </DatapadLayout>
  );
}
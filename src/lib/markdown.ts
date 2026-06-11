import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BaseFrontmatter, MarkdownDocument } from '@/types/content';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

// Alle Slugs eines Ordners lesen (für statische Routen)
export function getSlugs(folder: string): string[] {
  const dir = path.join(CONTENT_ROOT, folder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

// Eine einzelne Datei lesen und parsen
export function getDocument<T extends BaseFrontmatter>(
  folder: string,
  slug: string
): MarkdownDocument<T> | null {
  const filePath = path.join(CONTENT_ROOT, folder, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    slug,
    frontmatter: data as T,
    content,
  };
}

// Alle Dokumente eines Ordners lesen (für Übersichtsseiten)
export function getAllDocuments<T extends BaseFrontmatter>(
  folder: string
): MarkdownDocument<T>[] {
  return getSlugs(folder)
    .map(slug => getDocument<T>(folder, slug))
    .filter((doc): doc is MarkdownDocument<T> => doc !== null);
}
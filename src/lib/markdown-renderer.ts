import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

function createProcessor() {
  return remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
    })
    .use(rehypeStringify);
}

let processor: ReturnType<typeof createProcessor> | null = null;

function getProcessor() {
  if (!processor) {
    processor = createProcessor();
  }
  return processor;
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const proc = getProcessor();
  const result = await proc.process(markdown);
  return String(result);
}
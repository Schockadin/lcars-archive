import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface MarkdownFrontmatterResult {
  // Frontmatter ist ein dynamisches YAML-Objekt; entspricht der bisherigen
  // gray-matter-Schnittstelle und wird von postgres.json() serialisiert.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- YAML keys are dynamic, matching the old gray-matter contract.
  data: Record<string, any>;
  content: string;
}

function parseMarkdownFrontmatter(markdown: string): MarkdownFrontmatterResult {
  const source = markdown.replace(/^\uFEFF/, "");
  const opening = /^---[ \t]*(?:\r\n|\n|\r)/.exec(source);
  if (!opening) return { data: {}, content: source };

  const remainder = source.slice(opening[0].length);
  const closing = /^(?:---|\.\.\.)[ \t]*(?:\r\n|\n|\r|$)/m.exec(remainder);
  if (!closing) return { data: {}, content: source };

  const parsed = parseYaml(remainder.slice(0, closing.index), {
    schema: "yaml-1.1",
    maxAliasCount: 100,
  });
  const data =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- parsed YAML has no statically known value shape.
      ? (parsed as Record<string, any>)
      : {};

  return {
    data,
    content: remainder.slice(closing.index + closing[0].length),
  };
}

function stringifyMarkdownFrontmatter(
  content: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors the legacy serializer input.
  data: Record<string, any>,
): string {
  const frontmatter = stringifyYaml(data, {
    schema: "yaml-1.1",
    lineWidth: 0,
  }).trimEnd();
  return `---\n${frontmatter}\n---\n${content}`;
}

// Kleine, sichere Teilmenge der gray-matter-Schnittstelle, die der Import,
// Ingest und Markdown-Export verwenden. YAML wird mit dem gepflegten `yaml`
// Parser verarbeitet und nicht mehr über js-yaml 3.x.
const matter = Object.assign(parseMarkdownFrontmatter, {
  stringify: stringifyMarkdownFrontmatter,
});

export default matter;

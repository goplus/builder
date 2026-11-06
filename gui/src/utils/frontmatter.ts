/** Simple string metadata parsed from frontmatter key-value lines. */
export type Frontmatter = Record<string, string>

/** Markdown document split into parsed frontmatter metadata and body content. */
export type MarkdownFrontmatter = {
  frontmatter: Frontmatter
  content: string
}

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function unquote(value: string): string {
  if (value.length < 2) return value
  const first = value[0]
  const last = value[value.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1)
  }
  return value
}

/** Parse simple key-value frontmatter lines; this is not a full YAML parser. */
export function parseFrontmatter(frontmatter: string): Frontmatter {
  const metadata: Frontmatter = {}
  for (const rawLine of frontmatter.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const matched = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (matched == null) continue
    metadata[matched[1]] = unquote(matched[2].trim())
  }
  return metadata
}

/** Parse markdown with frontmatter when present; returns null for plain markdown. */
export function parseMarkdownWithFrontmatter(markdown: string): MarkdownFrontmatter | null {
  const matched = markdown.match(frontmatterPattern)
  if (matched == null) return null
  return {
    frontmatter: parseFrontmatter(matched[1]),
    content: matched[2]
  }
}

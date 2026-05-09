// Skill document format reference: https://agentskills.io/specification

type ParsedSkillMetadata = {
  name: string
  description: string
}

export type ParsedSkillDocument = ParsedSkillMetadata & {
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

function parseFrontmatter(frontmatter: string): ParsedSkillMetadata {
  const metadata = new Map<string, string>()
  for (const rawLine of frontmatter.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const matched = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (matched == null) continue
    metadata.set(matched[1], unquote(matched[2].trim()))
  }

  const name = metadata.get('name') ?? ''
  const description = metadata.get('description') ?? ''
  if (name === '') throw new Error('Skill frontmatter must contain a non-empty name')
  if (description === '') throw new Error('Skill frontmatter must contain a non-empty description')
  return { name, description }
}

export function parseSkillDocument(markdown: string): ParsedSkillDocument {
  const matched = markdown.match(frontmatterPattern)
  if (matched == null) throw new Error('Skill document must start with YAML frontmatter')
  const metadata = parseFrontmatter(matched[1])
  return {
    ...metadata,
    content: matched[2].trim()
  }
}

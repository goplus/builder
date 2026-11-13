// Skill document format reference: https://agentskills.io/specification

import { parseMarkdownWithFrontmatter } from '@/utils/frontmatter'

type ParsedSkillMetadata = {
  name: string
  description: string
}

export type ParsedSkillDocument = ParsedSkillMetadata & {
  content: string
}

function parseSkillMetadata(metadata: Record<string, string>): ParsedSkillMetadata {
  const name = metadata.name ?? ''
  const description = metadata.description ?? ''
  if (name === '') throw new Error('Skill frontmatter must contain a non-empty name')
  if (description === '') throw new Error('Skill frontmatter must contain a non-empty description')
  return { name, description }
}

export function parseSkillDocument(markdown: string): ParsedSkillDocument {
  const parsed = parseMarkdownWithFrontmatter(markdown)
  if (parsed == null) throw new Error('Skill document must start with YAML frontmatter')
  const metadata = parseSkillMetadata(parsed.frontmatter)
  return {
    ...metadata,
    content: parsed.content.trim()
  }
}

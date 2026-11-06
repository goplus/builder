import { escapeHTML } from '@/utils/utils'

function formatSkillResources(resourcePaths: string[]): string {
  if (resourcePaths.length === 0) return ''
  const resources = resourcePaths.map((path) => `  <file>${escapeHTML(path)}</file>`).join('\n')
  return `\n\n<skill_resources>\n${resources}\n</skill_resources>`
}

export function wrapSkillContent(name: string, path: string, content: string, resourcePaths: string[] = []): string {
  const attrs = [`name="${escapeHTML(name)}"`, `path="${escapeHTML(path)}"`]
  const resources = formatSkillResources(resourcePaths)
  return `<skill_content ${attrs.join(' ')}>
${content}${resources}
</skill_content>`
}

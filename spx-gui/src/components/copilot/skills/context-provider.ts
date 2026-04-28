import type { ICopilotContextProvider } from '../copilot'
import type { SkillManifestItem, SkillRegistry } from './types'

function formatCatalogItems(items: SkillManifestItem[]): string {
  return items.map((item) => `- Skill name: ${item.name}\n  Description: ${item.description}`).join('\n')
}

function formatSkillCatalog(items: SkillManifestItem[]): string {
  if (items.length === 0) return ''
  return `# Skills

When a task matches a skill description, call \`load_skill\` with the exact skill name to read the skill.
You can also read resources in a skill by calling \`load_skill_resource\` with the skill name and the resource path.

Here are the available skills:

${formatCatalogItems(items)}`
}

export class SkillCatalogContextProvider implements ICopilotContextProvider {
  constructor(private registry: SkillRegistry) {}

  async provideContext(): Promise<string> {
    return formatSkillCatalog(await this.registry.list())
  }
}

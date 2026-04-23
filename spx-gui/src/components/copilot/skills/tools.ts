import { z } from 'zod'
import { escapeHTML } from '@/utils/utils'
import type { ToolDefinition } from '../copilot'
import type { SkillRegistry } from './types'

function formatSkillResources(resourcePaths: string[]): string {
  if (resourcePaths.length === 0) return ''
  const resources = resourcePaths.map((path) => `  <file>${escapeHTML(path)}</file>`).join('\n')
  return `\n\n<skill_resources>\n${resources}\n</skill_resources>`
}

function wrapSkillContent(name: string, path: string, content: string, resourcePaths: string[] = []): string {
  const attrs = [`name="${escapeHTML(name)}"`, `path="${escapeHTML(path)}"`]
  const resources = resourcePaths.length > 0 ? formatSkillResources(resourcePaths) : ''
  return `<skill_content ${attrs.join(' ')}>
${content}${resources}
</skill_content>`
}

const loadSkillParamsSchema = z.object({
  skillName: z.string().describe('Exact skill name from the available-skill catalog')
})

export function createLoadSkillTool(registry: SkillRegistry): ToolDefinition {
  return {
    name: 'load_skill',
    description: `Load the main document of a skill. ` + `Use when the current task matches a skill description.`,
    parameters: loadSkillParamsSchema,
    async implementation({ skillName }: z.infer<typeof loadSkillParamsSchema>) {
      const skillDocument = await registry.load(skillName)
      return wrapSkillContent(skillDocument.name, 'SKILL.md', skillDocument.instructions, skillDocument.resourcePaths)
    }
  }
}

const loadSkillResourceParamsSchema = z.object({
  skillName: z.string().describe('Exact skill name from the available-skill catalog'),
  resourcePath: z.string().describe('Exact resource path exposed by the previously loaded skill')
})

export function createLoadSkillResourceTool(registry: SkillRegistry): ToolDefinition {
  return {
    name: 'load_skill_resource',
    description:
      `Load a resource from a skill. ` +
      `Use this when you already know the exact resource path, typically after load_skill has listed the available resource paths.`,
    parameters: loadSkillResourceParamsSchema,
    async implementation({ skillName, resourcePath }: z.infer<typeof loadSkillResourceParamsSchema>) {
      const resourceContent = await registry.loadResource(skillName, resourcePath)
      return wrapSkillContent(skillName, resourcePath, resourceContent)
    }
  }
}

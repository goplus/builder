import { z } from 'zod'
import type { ToolDefinition } from '../copilot'
import { wrapSkillContent } from './content'
import type { SkillRegistry } from './types'

type PreloadedSkillChecker = (skillName: string) => boolean

const loadSkillParamsSchema = z.object({
  skillName: z.string().describe('Exact skill name from the available-skill catalog')
})

export function createLoadSkillTool(
  registry: SkillRegistry,
  /**
   * Function to check if a skill has already been preloaded.
   * Loading request for preloaded skills will be skipped to save token and reduce latency.
   */
  isSkillPreloaded: PreloadedSkillChecker = () => false
): ToolDefinition {
  return {
    name: 'load_skill',
    description: `Load the main document of a skill. ` + `Use when the current task matches a skill description.`,
    parameters: loadSkillParamsSchema,
    async implementation({ skillName }: z.infer<typeof loadSkillParamsSchema>) {
      if (isSkillPreloaded(skillName)) {
        return `Skill "${skillName}" is already preloaded.`
      }
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

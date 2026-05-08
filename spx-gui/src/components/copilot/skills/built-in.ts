import { fromText, type Files } from '@/models/common/file'
import { InMemorySkillRegistry } from './registry'
import type { SkillBundle, SkillRegistry } from './types'

export const skillSpxProject = 'spx-project'
export const skillXgoLanguage = 'xgo-language'

const builtInSkills = [skillSpxProject, skillXgoLanguage]

const bundleFiles = import.meta.glob(
  './bundles/**/*.md', // For now we only bundle markdown resources from built-in skills.
  {
    eager: true,
    query: '?raw',
    import: 'default'
  }
) as Record<string, string>

function createBuiltInSkillBundle(name: string): SkillBundle {
  const files: Files = {}
  const pathPrefix = `./bundles/${name}/`
  for (const path of Object.keys(bundleFiles).sort()) {
    if (!path.startsWith(pathPrefix)) continue
    const filePath = path.slice(pathPrefix.length)
    files[filePath] = fromText(filePath, bundleFiles[path])
  }
  return { files }
}

export function createBuiltInSkillRegistry(): SkillRegistry {
  const registry = new InMemorySkillRegistry()
  for (const name of builtInSkills) {
    const bundle = createBuiltInSkillBundle(name)
    registry.register(bundle)
  }
  return registry
}

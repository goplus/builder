import { getSpxProjectSkillFiles, spxProjectSkillName } from '@/utils/spx'
import { getXGoLanguageSkillFiles, xgoLanguageSkillName } from '@/utils/xgo'
import { fromText, type Files } from '@/models/common/file'
import { InMemorySkillRegistry } from './registry'
import type { SkillBundle, SkillRegistry } from './types'

export const skillSpxProject = spxProjectSkillName
export const skillXgoLanguage = xgoLanguageSkillName

const builtInSkillFileGetters = [getSpxProjectSkillFiles, getXGoLanguageSkillFiles]

function createBuiltInSkillBundle(skillFiles: Record<string, string>): SkillBundle {
  const files: Files = {}
  for (const [filePath, content] of Object.entries(skillFiles)) {
    files[filePath] = fromText(filePath, content)
  }
  return { files }
}

export function createBuiltInSkillRegistry(): SkillRegistry {
  const registry = new InMemorySkillRegistry()
  for (const getFiles of builtInSkillFileGetters) {
    const bundle = createBuiltInSkillBundle(getFiles())
    registry.register(bundle)
  }
  return registry
}

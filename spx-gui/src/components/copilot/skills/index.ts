import { fromText, type Files } from '@/models/common/file'
import { Disposable, type Disposer } from '@/utils/disposable'
import type { Copilot } from '../copilot'
import { SkillCatalogContextProvider } from './context-provider'
import { InMemorySkillRegistry } from './registry'
import { createLoadSkillResourceTool, createLoadSkillTool } from './tools'
import type { SkillBundle, SkillRegistry } from './types'

const builtInSkills = ['spx-project', 'xgo-language']

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

/** Register built-in skill support to the given Copilot instance. */
export function registerSkillSupport(copilot: Copilot): Disposer {
  const disposable = new Disposable()
  const registry = createBuiltInSkillRegistry()
  disposable.addDisposer(copilot.registerContextProvider(new SkillCatalogContextProvider(registry)))
  disposable.addDisposer(copilot.registerTool(createLoadSkillTool(registry)))
  disposable.addDisposer(copilot.registerTool(createLoadSkillResourceTool(registry)))
  return () => disposable.dispose()
}

import { parseDefinitionId, type DefinitionIdentifier, type IXGoProject } from '@/components/xgo-code-editor'

/** Resolves authored references at input boundaries; internal definition IDs keep full package paths. */
export function resolveDefinitionId(id: string, project: IXGoProject): DefinitionIdentifier {
  if (id === 'xgo:' || !/^xgo:[^?#\s]*(?:\?[^?#\s]+)?(?:#[^?#\s]+)?$/.test(id)) {
    throw new Error(`Invalid definition ID: ${id}`)
  }
  const definition = parseDefinitionId(id)
  if (definition.package !== 'spx') return definition

  const packagePath = project.classFramework.pkgPaths[0]
  if (packagePath == null || packagePath === '') throw new Error('Cannot resolve spx: SPX package is not configured')
  return { ...definition, package: packagePath }
}

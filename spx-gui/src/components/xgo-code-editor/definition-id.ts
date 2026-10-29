export type DefinitionIdentifier = {
  /**
   * Full name of source package.
   * If not provided, it's assumed to be kind-statement.
   * If `main`, it's the current user package.
   * Examples:
   * - `fmt`
   * - `github.com/goplus/spx/v3`
   * - `main`
   */
  package?: string
  /**
   * Exported name of the definition.
   * If not provided, it's assumed to be kind-package.
   * Examples:
   * - `Println`
   * - `Sprite`
   * - `Sprite.turn`
   * - `for_statement_with_single_condition`: kind-statement
   */
  name?: string
  /** Overload Identifier. */
  overloadId?: string
}

/** xgo:<package>?<name>#<overloadId> */
export type DefinitionIdString = string

export function stringifyDefinitionId(defId: DefinitionIdentifier): DefinitionIdString {
  let idStr = 'xgo:'
  if (defId.package != null) idStr += `${defId.package}`
  if (defId.name != null) idStr += `?${encodeURIComponent(defId.name)}`
  if (defId.overloadId != null) idStr += `#${encodeURIComponent(defId.overloadId)}`
  return idStr
}

export function parseDefinitionId(idStr: DefinitionIdString): DefinitionIdentifier {
  if (idStr === 'xgo:' || !/^xgo:[^?#\s]*(?:\?[^?#\s]+)?(?:#[^?#\s]+)?$/.test(idStr)) {
    throw new Error(`Invalid definition ID: ${idStr}`)
  }
  const [withoutHash, hash = ''] = idStr.slice(4).split('#')
  const [hostWithPath, query = ''] = withoutHash.split('?')
  try {
    return {
      package: hostWithPath === '' ? undefined : hostWithPath,
      name: query === '' ? undefined : decodeURIComponent(query),
      overloadId: hash === '' ? undefined : decodeURIComponent(hash)
    }
  } catch (cause) {
    throw new Error(`Invalid definition ID: ${idStr}`, { cause })
  }
}

/**
 * Parse receiver & method in `DefinitionIdentifier.name`.
 * For example:
 *  - 'Game.timer' => ['Game', 'timer']
 *  - 'Sprite.heading' => ['Sprite', 'heading']
 *  - 'hour' => [null, 'hour']
 */
export function parseDefinitionName(name: string | undefined): [receiver: string | null, method: string] {
  const parts = (name ?? '').split('.')
  if (parts.length > 1) return [parts[0], parts[1]]
  return [null, parts[0]]
}

/** Project-provided package paths, keyed by preset name without the `preset/` prefix. */
export type PresetPackages = Readonly<Record<string, string>>

/**
 * Resolves `preset/<name>` using the supplied packages; unknown presets return null.
 * Other package paths remain literal.
 */
export function resolveDefinitionId(
  definition: DefinitionIdentifier,
  presetPackages: PresetPackages
): DefinitionIdentifier | null {
  if (!definition.package?.startsWith('preset/')) return definition

  const preset = definition.package.slice('preset/'.length)
  const packagePath = Object.hasOwn(presetPackages, preset) ? presetPackages[preset] : null
  if (packagePath == null || packagePath === '') return null
  return { ...definition, package: packagePath }
}

/**
 * @desc Spx-specific types and utilities: resource URI parsing/building,
 * ColorValue, SpxInputTypedValue, SpxInputSlotAccept,
 * and the merged InputTypedValue / InputSlotAccept union types assembled from the
 * generic (xgo) layer + spx-specific variants.
 */

import type { ColorValue } from '@/utils/spx'
import { capture } from '@/utils/exception'
import type { SpxProject } from '@/models/spx/project'
import { type ResourceModel, type ResourceType } from '@/models/spx/common/resource'
import { Sprite } from '@/models/spx/sprite'
import { Sound } from '@/models/spx/sound'
import { Backdrop } from '@/models/spx/backdrop'
import { Costume } from '@/models/spx/costume'
import { Animation } from '@/models/spx/animation'
import { isWidget } from '@/models/spx/widget'
import type { Monitor } from '@/models/spx/widget/monitor'
import { Stage, stageCodeFilePaths } from '@/models/spx/stage'
import {
  BuiltInInputType as XGoBuiltInInputType,
  type ResourceURI,
  type ResourceContextURI,
  type ResourceIdentifier,
  type TextDocumentIdentifier,
  getCodeFilePath,
  type Property
} from '../xgo-code-editor'

export type { ResourceModel }

const resourceURIPrefix = 'spx://resources/'

/** Check if given URI is a resource URI or a resource context URI */
export function isResourceUri(uri: string): boolean {
  return uri.startsWith(resourceURIPrefix)
}

/** Map from `ResourceURI` part to `ResourceType` */
const resourceTypeMap: Record<string, ResourceType | undefined> = {
  sounds: 'sound',
  sprites: 'sprite',
  backdrops: 'backdrop',
  widgets: 'widget',
  animations: 'animation',
  costumes: 'costume',
  stage: 'stage'
}

export type ResourceNameWithType = {
  type: ResourceType
  name: string
}

/**
 * We should encode resource name in URI because it may contain special characters (e.g., `/`),
 * but now the language server doesn't do the encoding when constructing the URI, which causes problems.
 * We temporarily disable encoding to keep things working, but we should fix the language server
 * to do the encoding and re-enable this in the future.
 */
const shouldEncodeResourceName = false

export function encodeResourceName(name: string): string {
  return shouldEncodeResourceName ? encodeURIComponent(name) : name
}

export function parseResourceURI(uri: ResourceURI): ResourceNameWithType[] {
  if (!isResourceUri(uri)) throw new Error(`Invalid resource URI: ${uri}`)
  const parts = uri.slice(resourceURIPrefix.length).split('/').map(decodeURIComponent)
  const parsed: ResourceNameWithType[] = []
  for (let i = 0; i < parts.length; ) {
    const type = resourceTypeMap[parts[i]]
    const name = parts[i + 1]
    if (type == null || (type !== 'stage' && name == null)) throw new Error(`Invalid resource uri: ${uri}`)
    parsed.push({ name, type })
    i += 2
  }
  return parsed
}

export function getResourceNameWithType(uri: ResourceURI): ResourceNameWithType {
  const parsed = parseResourceURI(uri)
  if (parsed.length === 0) throw new Error(`Invalid resource uri: ${uri}`)
  return parsed.pop()!
}

export type ResourceContext = {
  parent: ResourceNameWithType[]
  type: ResourceType
}

export function parseResourceContextURI(uri: ResourceContextURI): ResourceContext {
  if (!isResourceUri(uri)) throw new Error(`Invalid resource context URI: ${uri}`)
  const parts = uri.slice(resourceURIPrefix.length).split('/').map(decodeURIComponent)
  const parent: ResourceNameWithType[] = []
  let lastType: ResourceType | null = null
  for (let i = 0; i < parts.length; ) {
    const type = resourceTypeMap[parts[i]]
    if (type == null) throw new Error(`Invalid resource context uri: ${uri}`)
    const name = parts[i + 1]
    if (name != null) {
      parent.push({ name, type })
    } else {
      lastType = type
      break
    }
    i += 2
  }
  if (lastType == null) throw new Error(`Invalid resource context uri: ${uri}`)
  return { parent, type: lastType }
}

export function getResourceModel(project: SpxProject, resourceId: ResourceIdentifier): ResourceModel | null {
  const parsed = parseResourceURI(resourceId.uri)
  switch (parsed[0].type) {
    case 'sound':
      return project.sounds.find((s) => s.name === parsed[0].name) ?? null
    case 'sprite': {
      const sprite = project.sprites.find((s) => s.name === parsed[0].name)
      if (sprite == null) return null
      if (parsed.length === 1) return sprite
      switch (parsed[1].type) {
        case 'animation':
          return sprite.animations.find((a) => a.name === parsed[1].name) ?? null
        case 'costume':
          return sprite.costumes.find((c) => c.name === parsed[1].name) ?? null
        default:
          throw new Error(`Invalid resource type: ${parsed[1].type}`)
      }
    }
    case 'backdrop':
      return project.stage.backdrops.find((b) => b.name === parsed[0].name) ?? null
    case 'widget':
      return project.stage.widgets.find((w) => w.name === parsed[0].name) ?? null
    case 'stage':
      return project.stage
    default:
      throw new Error(`Invalid resource type: ${parsed[0].type}`)
  }
}

export function getResourceURI(resource: ResourceModel): string {
  if (resource instanceof Sprite) return `${resourceURIPrefix}sprites/${encodeResourceName(resource.name)}`
  if (resource instanceof Sound) return `${resourceURIPrefix}sounds/${encodeResourceName(resource.name)}`
  if (resource instanceof Backdrop) return `${resourceURIPrefix}backdrops/${encodeResourceName(resource.name)}`
  if (resource instanceof Costume) {
    const parent = resource.parent
    if (parent == null) throw new Error(`Costume ${resource.name} has no sprite`)
    if (!(parent instanceof Sprite)) throw new Error(`Invalid parent type: ${parent}`)
    return `${resourceURIPrefix}sprites/${encodeResourceName(parent.name)}/costumes/${encodeResourceName(resource.name)}`
  }
  if (resource instanceof Animation) {
    const sprite = resource.sprite
    if (sprite == null) throw new Error(`Animation ${resource.name} has no sprite`)
    return `${resourceURIPrefix}sprites/${encodeResourceName(sprite.name)}/animations/${encodeResourceName(resource.name)}`
  }
  if (isWidget(resource)) return `${resourceURIPrefix}widgets/${encodeResourceName(resource.name)}`
  if (resource instanceof Stage) return `${resourceURIPrefix}stage`
  throw new Error(`Unsupported resource type: ${resource}`)
}

export function getResourceIdentifier(resource: ResourceModel): ResourceIdentifier {
  return { uri: getResourceURI(resource) }
}

export function textDocumentId2ResourceId(id: TextDocumentIdentifier, project: SpxProject): ResourceIdentifier | null {
  const codeFilePath = getCodeFilePath(id.uri)
  let model: ResourceModel | null = null
  if (stageCodeFilePaths.includes(codeFilePath)) {
    model = project.stage
  } else {
    for (const sprite of project.sprites) {
      if (sprite.codeFilePath === codeFilePath) {
        model = sprite
        break
      }
    }
  }
  if (model == null) return null
  return { uri: getResourceURI(model) }
}

export function isTextDocumentStageCode(id: TextDocumentIdentifier): boolean {
  return stageCodeFilePaths.includes(getCodeFilePath(id.uri))
}

export function textDocumentId2CodeFileName(id: TextDocumentIdentifier) {
  const codeFilePath = getCodeFilePath(id.uri)
  if (stageCodeFilePaths.includes(codeFilePath)) {
    return { en: 'Stage', zh: '舞台' }
  } else {
    const spriteName = codeFilePath.replace(/\.spx$/, '')
    return { en: spriteName, zh: spriteName }
  }
}

export type { ColorValue }

export enum SpxInputType {
  /** `Direction` in spx */
  SpxDirection = 'spx-direction',
  /** `layerAction` in spx */
  SpxLayerAction = 'spx-layer-action',
  /** `dirAction` in spx */
  SpxDirAction = 'spx-dir-action',
  /** `Color` in spx */
  SpxColor = 'spx-color',
  /** `EffectKind` in spx */
  SpxEffectKind = 'spx-effect-kind',
  /** `Key` in spx */
  SpxKey = 'spx-key',
  /** `PlayAction` in spx */
  SpxPlayAction = 'spx-play-action',
  /** `specialObj` in spx */
  SpxSpecialObj = 'spx-special-obj',
  /** `RotationStyle` in spx */
  SpxRotationStyle = 'spx-rotation-style',
  /** Unknown type */
  Unknown = XGoBuiltInInputType.Unknown
}

export type SpxInputTypedValue =
  | { type: SpxInputType.SpxDirection; value: number }
  | { type: SpxInputType.SpxLayerAction; value: string }
  | { type: SpxInputType.SpxDirAction; value: string }
  | {
      type: SpxInputType.SpxColor
      value: ColorValue
    }
  | {
      type: SpxInputType.SpxEffectKind
      /** Name of `EffectKind` in spx, e.g., `ColorEffect` */
      value: string
    }
  | {
      type: SpxInputType.SpxKey
      /** Name of `Key` in spx, e.g., `Key0` */
      value: string
    }
  | {
      type: SpxInputType.SpxPlayAction
      /** Name of `PlayAction` in spx, e.g., `PlayPause` */
      value: string
    }
  | {
      type: SpxInputType.SpxSpecialObj
      /** Name of `specialObj` in spx, e.g., `Mouse` */
      value: string
    }
  | {
      type: SpxInputType.SpxRotationStyle
      /** Name of `RotationStyle` in spx, e.g., `Normal` */
      value: string
    }

export type InputValueForSpxType<T> = (SpxInputTypedValue & { type: T })['value']

/** The LSP target name for stage (the "Game" type in spx). */
export const lspStageTarget = 'Game'

/** Get visible monitors whose variable binding is invalid */
export async function getInvalidMonitors(
  monitors: Monitor[],
  spriteNames: Set<string>,
  getProperties: (target: string, signal?: AbortSignal) => Promise<Property[]>,
  signal?: AbortSignal
): Promise<Monitor[]> {
  const visibleMonitors = monitors.filter((m) => m.visible)
  if (visibleMonitors.length === 0) return []

  // Cache for successfully fetched properties of each target to avoid redundant LSP requests.
  // Failed targets are not cached so they can be retried for subsequent monitors.
  const propertyNamesMap = new Map<string, Set<string>>()
  const invalidMonitors: Monitor[] = []
  for (const monitor of visibleMonitors) {
    if (monitor.variableName === '') {
      invalidMonitors.push(monitor)
      continue
    }
    if (monitor.target !== '' && !spriteNames.has(monitor.target)) {
      invalidMonitors.push(monitor)
      continue
    }
    let propertyNames = propertyNamesMap.get(monitor.target)
    if (propertyNames == null) {
      try {
        const properties = await getProperties(monitor.target, signal)
        propertyNames = new Set(properties.map((p) => p.name))
        propertyNamesMap.set(monitor.target, propertyNames)
      } catch (e) {
        capture(e, `Failed to load properties for target: "${monitor.target}"`)
        continue
      }
    }
    if (!propertyNames.has(monitor.variableName)) {
      invalidMonitors.push(monitor)
    }
  }
  return invalidMonitors
}

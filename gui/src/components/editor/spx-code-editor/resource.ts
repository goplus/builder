/**
 * @desc SpxResourceAdapter — spx-specific resource adapter.
 * Extends the generic ResourceAdapter with spx-specific UI extension points.
 */

import { AssetType } from '@/apis/asset'
import {
  useRenameAnimation,
  useRenameBackdrop,
  useRenameCostume,
  useRenameSound,
  useRenameSprite,
  useRenameWidget,
  useAddAnimationByGroupingCostumes,
  useAddAssetFromLibrary,
  useAddBackdropFromLocalFile,
  useAddCostumeFromLocalFile,
  useAddMonitor,
  useAddSoundByRecording,
  useAddSoundFromLocalFile,
  useAddSpriteFromLocalFile
} from '@/components/asset'
import type { LocaleMessage } from '@/utils/i18n'
import type { ResourceModel } from '@/models/spx/common/resource'
import { Sprite } from '@/models/spx/sprite'
import { Sound } from '@/models/spx/sound'
import { Costume } from '@/models/spx/costume'
import { Animation } from '@/models/spx/animation'
import { Backdrop } from '@/models/spx/backdrop'
import { isWidget } from '@/models/spx/widget'
import type { SpxProject } from '@/models/spx/project'
import type { Stage } from '@/models/spx/stage'
import { humanizeResourceType } from '@/models/spx/common/resource'
import type { EditorState } from '../editor-state'
import {
  type ResourceIdentifier,
  type ResourceContextURI,
  ResourceAdapter,
  type IResourceSelector,
  type ResourceItemComponent,
  type ILSPClient
} from '@/components/xgo-code-editor'
import { getResourceModel, getResourceNameWithType, getResourceURI, parseResourceContextURI } from './common'
import SpxResourceItem from './ui/resource/SpxResourceItem.vue'

type CreateMethod<T> = {
  label: LocaleMessage
  handler: () => Promise<T | T[]>
}

type SelectableResource = Exclude<ResourceModel, Stage>
type SelectableResourceSelector = {
  items: SelectableResource[]
  createMethods: Array<CreateMethod<SelectableResource>>
}

export function useResourceSelectorHelpers() {
  return {
    addAssetFromLibrary: useAddAssetFromLibrary(),
    addSoundFromLocalFile: useAddSoundFromLocalFile(),
    addSoundByRecording: useAddSoundByRecording(),
    addSpriteFromLocalFile: useAddSpriteFromLocalFile(),
    addAnimationByGroupingCostumes: useAddAnimationByGroupingCostumes(),
    addBackdropFromLocalFile: useAddBackdropFromLocalFile(),
    addMonitor: useAddMonitor(),
    addCostumeFromLocalFile: useAddCostumeFromLocalFile()
  }
}

export type ResourceSelectorHelpers = ReturnType<typeof useResourceSelectorHelpers>

function createSoundSelector(project: SpxProject, helpers: ResourceSelectorHelpers): SelectableResourceSelector {
  return {
    items: project.sounds,
    createMethods: [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => helpers.addSoundFromLocalFile(project)
      },
      {
        label: { en: 'Choose from asset library', zh: '从素材库选择' },
        handler: () => helpers.addAssetFromLibrary(project, AssetType.Sound)
      },
      {
        label: { en: 'Record', zh: '录音' },
        handler: () => helpers.addSoundByRecording(project)
      }
    ]
  }
}

function createSpriteSelector(project: SpxProject, helpers: ResourceSelectorHelpers): SelectableResourceSelector {
  return {
    items: project.sprites,
    createMethods: [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => helpers.addSpriteFromLocalFile(project)
      },
      {
        label: { en: 'Choose from asset library', zh: '从素材库选择' },
        handler: () => helpers.addAssetFromLibrary(project, AssetType.Sprite)
      }
    ]
  }
}

function createAnimationSelector(
  project: SpxProject,
  sprite: Sprite,
  helpers: ResourceSelectorHelpers
): SelectableResourceSelector {
  return {
    items: sprite.animations,
    createMethods: [
      {
        label: { en: 'Group costumes as animation', zh: '将造型合并为动画' },
        handler: () => helpers.addAnimationByGroupingCostumes(project, sprite)
      }
    ]
  }
}

function createBackdropSelector(project: SpxProject, helpers: ResourceSelectorHelpers): SelectableResourceSelector {
  return {
    items: project.stage.backdrops,
    createMethods: [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => helpers.addBackdropFromLocalFile(project)
      },
      {
        label: { en: 'Choose from asset library', zh: '从素材库选择' },
        handler: () => helpers.addAssetFromLibrary(project, AssetType.Backdrop)
      }
    ]
  }
}

function createWidgetSelector(project: SpxProject, helpers: ResourceSelectorHelpers): SelectableResourceSelector {
  return {
    items: project.stage.widgets,
    createMethods: [
      {
        label: { en: 'Add widget monitor', zh: '添加监视器控件' },
        handler: () => helpers.addMonitor(project)
      }
    ]
  }
}

function createCostumeSelector(sprite: Sprite, helpers: ResourceSelectorHelpers): SelectableResourceSelector {
  return {
    items: sprite.costumes,
    createMethods: [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => helpers.addCostumeFromLocalFile(sprite)
      }
    ]
  }
}

function createResourceSelector(
  project: SpxProject,
  contextURI: ResourceContextURI,
  helpers: ResourceSelectorHelpers
): SelectableResourceSelector {
  const { parent, type } = parseResourceContextURI(contextURI)
  const parts = [...parent, { type, name: null }]
  switch (parts[0].type) {
    case 'sound':
      return createSoundSelector(project, helpers)
    case 'sprite': {
      const spriteName = parts[0].name
      if (parts.length === 1) return createSpriteSelector(project, helpers)
      const sprite = project.sprites.find((s) => s.name === spriteName)
      if (sprite == null) throw new Error(`Sprite not found: ${spriteName}`)
      switch (parts[1].type) {
        case 'animation':
          return createAnimationSelector(project, sprite, helpers)
        case 'costume':
          return createCostumeSelector(sprite, helpers)
        default:
          throw new Error(`Unexpected sub-resource type: ${parts[1].type}`)
      }
    }
    case 'backdrop':
      return createBackdropSelector(project, helpers)
    case 'widget':
      return createWidgetSelector(project, helpers)
    default:
      throw new Error(`Unexpected resource type: ${parts[0].type}`)
  }
}

export function useResourceRenameHelpers() {
  return {
    renameSprite: useRenameSprite(),
    renameSound: useRenameSound(),
    renameCostume: useRenameCostume(),
    renameBackdrop: useRenameBackdrop(),
    renameAnimation: useRenameAnimation(),
    renameWidget: useRenameWidget()
  }
}

export type ResourceRenameHelpers = ReturnType<typeof useResourceRenameHelpers>

export class SpxResourceAdapter extends ResourceAdapter {
  constructor(
    lspClient: ILSPClient,
    private editorState: EditorState,
    private resourceSelectorHelpers: ResourceSelectorHelpers,
    private resourceRenameHelpers: ResourceRenameHelpers
  ) {
    super(lspClient)
  }

  override provideResourceSelector(contextURI: string): IResourceSelector | null {
    const project = this.editorState.project
    const { type } = parseResourceContextURI(contextURI)
    const humanizedType = humanizeResourceType(type)
    const selector = createResourceSelector(project, contextURI, this.resourceSelectorHelpers)
    return {
      title: { en: `Select a ${humanizedType.en}`, zh: `选择${humanizedType.zh}` },
      getItems() {
        return selector.items.map((item) => {
          const uri = getResourceURI(item)
          return { uri }
        })
      },
      createMethods: selector.createMethods.map((m) => ({
        label: m.label,
        handler: async () => {
          const created = await m.handler()
          const firstCreated = Array.isArray(created) ? created[0] : created
          if (firstCreated == null) return null
          const uri = getResourceURI(firstCreated)
          return { uri } satisfies ResourceIdentifier
        }
      }))
    }
  }

  override provideResourceItemRenderer(): ResourceItemComponent | null {
    return SpxResourceItem
  }

  override provideResourceName(resource: ResourceIdentifier): string {
    const { name } = getResourceNameWithType(resource.uri)
    return name
  }

  async requestResourceRename(resource: ResourceIdentifier): Promise<void> {
    const model = getResourceModel(this.editorState.project, resource)
    if (model == null) throw new Error(`Resource (${resource.uri}) not found`)
    if (model instanceof Sprite) return this.resourceRenameHelpers.renameSprite(model)
    if (model instanceof Sound) return this.resourceRenameHelpers.renameSound(model)
    if (model instanceof Backdrop) return this.resourceRenameHelpers.renameBackdrop(model)
    if (model instanceof Costume) return this.resourceRenameHelpers.renameCostume(model)
    if (model instanceof Animation) return this.resourceRenameHelpers.renameAnimation(model)
    if (isWidget(model)) return this.resourceRenameHelpers.renameWidget(model)
    throw new Error(`Rename resource (${resource.uri}) not supported`)
  }

  async openResource(resource: ResourceIdentifier): Promise<void> {
    const model = getResourceModel(this.editorState.project, resource)
    if (model == null) throw new Error(`Resource not found: ${resource.uri}`)
    this.editorState.selectResource(model)
  }
}

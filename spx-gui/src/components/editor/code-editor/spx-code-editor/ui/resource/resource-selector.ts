import { AssetType } from '@/apis/asset'
import type { ResourceModel } from '@/models/spx/common/resource'
import type { SpxProject } from '@/models/spx/project'
import { Sound } from '@/models/spx/sound'
import { Sprite } from '@/models/spx/sprite'
import { Animation } from '@/models/spx/animation'
import { Backdrop } from '@/models/spx/backdrop'
import { type Widget } from '@/models/spx/widget'
import { Costume } from '@/models/spx/costume'
import type { Stage } from '@/models/spx/stage'
import type { LocaleMessage } from '@/utils/i18n'
import {
  useAddAssetFromLibrary,
  useAddSoundFromLocalFile,
  useAddSoundByRecording,
  useAddSpriteFromLocalFile,
  useAddAnimationByGroupingCostumes,
  useAddBackdropFromLocalFile,
  useAddMonitor,
  useAddCostumeFromLocalFile
} from '@/components/asset'
import type { ResourceContextURI } from '../../../xgo-code-editor'
import { parseResourceContextURI } from '../../common'

export type CreateMethod<T> = {
  label: LocaleMessage
  handler: () => Promise<T | T[]>
}

export type SelectableResource = Exclude<ResourceModel, Stage>

// TODO: Merge with `IResourceSelector` in `xgo-code-editor` to simplify the codebase.
export interface IResourceSelector<T extends SelectableResource> {
  items: T[]
  useCreateMethods(): Array<CreateMethod<T>>
}

class SoundSelector implements IResourceSelector<Sound> {
  get items() {
    return this.project.sounds
  }

  constructor(private project: SpxProject) {}

  useCreateMethods() {
    const addFromLocalFile = useAddSoundFromLocalFile()
    const addFromAssetLibrary = useAddAssetFromLibrary()
    const addFromRecording = useAddSoundByRecording()
    return [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => addFromLocalFile(this.project)
      },
      {
        label: { en: 'Choose from asset library', zh: '从素材库选择' },
        handler: () => addFromAssetLibrary(this.project, AssetType.Sound)
      },
      {
        label: { en: 'Record', zh: '录音' },
        handler: () => addFromRecording(this.project)
      }
    ]
  }
}

class SpriteSelector implements IResourceSelector<Sprite> {
  get items() {
    return this.project.sprites
  }

  constructor(private project: SpxProject) {}

  useCreateMethods() {
    const addFromLocalFile = useAddSpriteFromLocalFile()
    const addFromAssetLibrary = useAddAssetFromLibrary()
    return [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => addFromLocalFile(this.project)
      },
      {
        label: { en: 'Choose from asset library', zh: '从素材库选择' },
        handler: () => addFromAssetLibrary(this.project, AssetType.Sprite)
      }
    ]
  }
}

class AnimationSelector implements IResourceSelector<Animation> {
  get items() {
    return this.sprite.animations
  }

  constructor(
    private project: SpxProject,
    private sprite: Sprite
  ) {}

  useCreateMethods() {
    const addAnimationByGroupingCostumes = useAddAnimationByGroupingCostumes()
    return [
      {
        label: { en: 'Group costumes as animation', zh: '将造型合并为动画' },
        handler: () => addAnimationByGroupingCostumes(this.project, this.sprite)
      }
    ]
  }
}

class BackdropSelector implements IResourceSelector<Backdrop> {
  get items() {
    return this.project.stage.backdrops
  }

  constructor(private project: SpxProject) {}

  useCreateMethods() {
    const addFromLocalFile = useAddBackdropFromLocalFile()
    const addFromAssetLibrary = useAddAssetFromLibrary()
    return [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => addFromLocalFile(this.project)
      },
      {
        label: { en: 'Choose from asset library', zh: '从素材库选择' },
        handler: () => addFromAssetLibrary(this.project, AssetType.Backdrop)
      }
    ]
  }
}

class WidgetSelector implements IResourceSelector<Widget> {
  get items() {
    return this.project.stage.widgets
  }

  constructor(private project: SpxProject) {}

  useCreateMethods() {
    const addMonitor = useAddMonitor()
    return [
      {
        label: { en: 'Add widget monitor', zh: '添加监视器控件' },
        handler: () => addMonitor(this.project)
      }
    ]
  }
}

class CostumeSelector implements IResourceSelector<Costume> {
  get items() {
    return this.sprite.costumes
  }

  constructor(
    private project: SpxProject,
    private sprite: Sprite
  ) {}

  useCreateMethods() {
    const addFromLocalFile = useAddCostumeFromLocalFile()
    return [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => addFromLocalFile(this.sprite)
      }
    ]
  }
}

export function createResourceSelector(
  project: SpxProject,
  contextURI: ResourceContextURI
): IResourceSelector<SelectableResource> {
  const { parent, type } = parseResourceContextURI(contextURI)
  const parts = [...parent, { type, name: null }]
  switch (parts[0].type) {
    case 'sound':
      return new SoundSelector(project)
    case 'sprite': {
      const spriteName = parts[0].name
      if (parts.length === 1) return new SpriteSelector(project)
      const sprite = project.sprites.find((s) => s.name === spriteName)
      if (sprite == null) throw new Error(`Sprite not found: ${spriteName}`)
      switch (parts[1].type) {
        case 'animation':
          return new AnimationSelector(project, sprite)
        case 'costume':
          return new CostumeSelector(project, sprite)
        default:
          throw new Error(`Unexpected sub-resource type: ${parts[1].type}`)
      }
    }
    case 'backdrop':
      return new BackdropSelector(project)
    case 'widget':
      return new WidgetSelector(project)
    default:
      throw new Error(`Unexpected resource type: ${parts[0].type}`)
  }
}

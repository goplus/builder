import { AssetType } from '@/apis/asset'
import type { ResourceModel } from '@/models/common/resource-model'
import type { Project } from '@/models/project'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { Animation } from '@/models/animation'
import { Backdrop } from '@/models/backdrop'
import { type Widget } from '@/models/widget'
import { Costume } from '@/models/costume'
import type { Stage } from '@/models/stage'
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
import { parseResourceContextURI, type ResourceContextURI } from '../../common'

export type CreateMethod<T> = {
  /** Label for the create method */
  label: LocaleMessage
  /** Handler when method invoked, which creates & return one or more resources */
  handler: () => Promise<T | T[]>
}

export type SelectableResource = Exclude<ResourceModel, Stage>

export interface IResourceSelector<T extends SelectableResource> {
  /** Title for `ResourceSelector` */
  title: LocaleMessage
  /** List of all selectable resources */
  items: T[]
  /** Methods to create new resources */
  useCreateMethods(): Array<CreateMethod<T>>
}

class SoundSelector implements IResourceSelector<Sound> {
  title = { en: 'Select a sound', zh: '选择声音' }
  get items() {
    return this.project.sounds
  }

  constructor(private project: Project) {}

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
  title = { en: 'Select a sprite', zh: '选择精灵' }
  get items() {
    return this.project.sprites
  }

  constructor(private project: Project) {}

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
        handler: () => addFromAssetLibrary(this.project, AssetType.Sprite) as Promise<Sprite[]>
      }
    ]
  }
}

class AnimationSelector implements IResourceSelector<Animation> {
  title = { en: 'Select an animation', zh: '选择动画' }
  get items() {
    return this.sprite.animations
  }

  constructor(
    private project: Project,
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
  title = { en: 'Select a backdrop', zh: '选择背景' }
  get items() {
    return this.project.stage.backdrops
  }

  constructor(private project: Project) {}

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
  title = { en: 'Select a widget', zh: '选择控件' }
  get items() {
    return this.project.stage.widgets
  }

  constructor(private project: Project) {}

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
  title = { en: 'Select a costume', zh: '选择造型' }
  get items() {
    return this.sprite.costumes
  }

  constructor(
    private project: Project,
    private sprite: Sprite
  ) {}

  useCreateMethods() {
    const addFromLocalFile = useAddCostumeFromLocalFile()
    return [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => addFromLocalFile(this.sprite, this.project)
      }
    ]
  }
}

export function createResourceSelector(
  project: Project,
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

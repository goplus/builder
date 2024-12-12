import { AssetType } from '@/apis/asset'
import type { Project } from '@/models/project'
import type { Sound } from '@/models/sound'
import type { Sprite } from '@/models/sprite'
import type { Animation } from '@/models/animation'
import type { Backdrop } from '@/models/backdrop'
import type { Widget } from '@/models/widget'
import type { Costume } from '@/models/costume'
import type { LocaleMessage } from '@/utils/i18n'
import type { ComponentDefinition } from '@/utils/types'
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
import type { InternalResourceReference } from '..'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import AnimationItem from './AnimationItem.vue'
import BackdropItem from './BackdropItem.vue'
import WidgetItem from './WidgetItem.vue'
import CostumeItem from './CostumeItem.vue'

type ItemComponentProps<T> = {
  item: T
  selected: boolean
}

type ItemComponentEmits = {
  click: []
}

export type CreateMethod<T> = {
  /** Label for the create method */
  label: LocaleMessage
  /** Handler when method invoked, which creates & return one or more resources */
  handler: () => Promise<T | T[]>
}

export type IResource = {
  /** Readable name and also unique identifier in list */
  name: string
}

export interface IResourceSelector<T extends IResource> {
  /** Title for `ResourceSelector` */
  title: LocaleMessage
  /** Component to render a resource item */
  itemComponent: ComponentDefinition<ItemComponentProps<T>, ItemComponentEmits>
  /** List of all selectable resources */
  items: T[]
  /** Current selected resource */
  currentItem: T
  /** Methods to create new resources */
  useCreateMethods(): Array<CreateMethod<T>>
}

class SoundSelector implements IResourceSelector<Sound> {
  title = { en: 'Select a sound', zh: '选择声音' }
  itemComponent = SoundItem
  get items() {
    return this.project.sounds
  }

  constructor(
    private project: Project,
    public currentItem: Sound
  ) {}

  useCreateMethods() {
    const addFromLocalFile = useAddSoundFromLocalFile(false)
    const addFromAssetLibrary = useAddAssetFromLibrary(false)
    const addFromRecording = useAddSoundByRecording(false)
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
  itemComponent = SpriteItem
  get items() {
    return this.project.sprites
  }

  constructor(
    private project: Project,
    public currentItem: Sprite
  ) {}

  useCreateMethods() {
    const addFromLocalFile = useAddSpriteFromLocalFile(false)
    const addFromAssetLibrary = useAddAssetFromLibrary(false)
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
  title = { en: 'Select an animation', zh: '选择动画' }
  itemComponent = AnimationItem
  get items() {
    return this.sprite.animations
  }

  constructor(
    private project: Project,
    private sprite: Sprite,
    public currentItem: Animation
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
  itemComponent = BackdropItem
  get items() {
    return this.project.stage.backdrops
  }

  constructor(
    private project: Project,
    public currentItem: Backdrop
  ) {}

  useCreateMethods() {
    const addFromLocalFile = useAddBackdropFromLocalFile(false)
    const addFromAssetLibrary = useAddAssetFromLibrary(false)
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
  itemComponent = WidgetItem
  get items() {
    return this.project.stage.widgets
  }

  constructor(
    private project: Project,
    public currentItem: Widget
  ) {}

  useCreateMethods() {
    const addMonitor = useAddMonitor(false)
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
  itemComponent = CostumeItem
  get items() {
    return this.sprite.costumes
  }

  constructor(
    private project: Project,
    private sprite: Sprite,
    public currentItem: Costume
  ) {}

  useCreateMethods() {
    const addFromLocalFile = useAddCostumeFromLocalFile(false)
    return [
      {
        label: { en: 'Select local file', zh: '选择本地文件' },
        handler: () => addFromLocalFile(this.sprite, this.project)
      }
    ]
  }
}

export function createResourceSelector(project: Project, rr: InternalResourceReference): IResourceSelector<any> {
  const resource = rr.resource
  const parsed = new URL(resource.uri)
  if (parsed.protocol !== 'spx:' || parsed.host !== 'resources')
    throw new Error(`Invalid resource URI: ${resource.uri}`)
  const parts = parsed.pathname.split('/')
  switch (parts[1]) {
    case 'sounds': {
      const sound = project.sounds.find((s) => s.name === parts[2])
      if (sound == null) throw new Error(`Sound not found: ${parts[2]}`)
      return new SoundSelector(project, sound)
    }
    case 'sprites': {
      const sprite = project.sprites.find((s) => s.name === parts[2])
      if (sprite == null) throw new Error(`Sprite not found: ${parts[2]}`)
      switch (parts[3]) {
        case 'animations': {
          const animation = sprite.animations.find((a) => a.name === parts[4])
          if (animation == null) throw new Error(`Animation not found: ${parts[4]}`)
          return new AnimationSelector(project, sprite, animation)
        }
        case 'costumes': {
          const costume = sprite.costumes.find((c) => c.name === parts[4])
          if (costume == null) throw new Error(`Costume not found: ${parts[4]}`)
          return new CostumeSelector(project, sprite, costume)
        }
        default:
          return new SpriteSelector(project, sprite)
      }
    }
    case 'backdrops': {
      const backdrop = project.stage.backdrops.find((b) => b.name === parts[2])
      if (backdrop == null) throw new Error(`Backdrop not found: ${parts[2]}`)
      return new BackdropSelector(project, backdrop)
    }
    case 'widgets': {
      const widget = project.stage.widgets.find((w) => w.name === parts[2])
      if (widget == null) throw new Error(`Widget not found: ${parts[2]}`)
      return new WidgetSelector(project, widget)
    }
    default:
      throw new Error(`Unsupported resource type: ${parts[1]}`)
  }
}

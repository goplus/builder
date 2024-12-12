import { AssetType } from '@/apis/asset'
import type { Project } from '@/models/project'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { Animation } from '@/models/animation'
import { Backdrop } from '@/models/backdrop'
import { isWidget, type Widget } from '@/models/widget'
import { Costume } from '@/models/costume'
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
import { getResourceModel, type IResourceModel } from '../../common'
import type { InternalResourceReference } from '..'

export type CreateMethod<T> = {
  /** Label for the create method */
  label: LocaleMessage
  /** Handler when method invoked, which creates & return one or more resources */
  handler: () => Promise<T | T[]>
}

export type IResource = IResourceModel

export interface IResourceSelector<T extends IResource> {
  /** Title for `ResourceSelector` */
  title: LocaleMessage
  /** List of all selectable resources */
  items: T[]
  /** Current selected resource */
  currentItem: T
  /** Methods to create new resources */
  useCreateMethods(): Array<CreateMethod<T>>
}

class SoundSelector implements IResourceSelector<Sound> {
  title = { en: 'Select a sound', zh: '选择声音' }
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
  get items() {
    return this.sprite.animations
  }

  private sprite: Sprite
  constructor(
    private project: Project,
    public currentItem: Animation
  ) {
    if (currentItem.sprite == null) throw new Error('Sprite expected')
    this.sprite = currentItem.sprite
  }

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
  get items() {
    return this.sprite.costumes
  }

  private sprite: Sprite
  constructor(
    private project: Project,
    public currentItem: Costume
  ) {
    if (!(currentItem.parent instanceof Sprite)) throw new Error('Costume sprite expeceted')
    this.sprite = currentItem.parent
  }

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
  const resourceModel = getResourceModel(project, rr.resource)
  if (resourceModel instanceof Sound) return new SoundSelector(project, resourceModel)
  if (resourceModel instanceof Sprite) return new SpriteSelector(project, resourceModel)
  if (resourceModel instanceof Animation) return new AnimationSelector(project, resourceModel)
  if (resourceModel instanceof Backdrop) return new BackdropSelector(project, resourceModel)
  if (resourceModel instanceof Costume) return new CostumeSelector(project, resourceModel)
  if (isWidget(resourceModel)) return new WidgetSelector(project, resourceModel)
  throw new Error(`Unknown resource model: ${resourceModel}`)
}

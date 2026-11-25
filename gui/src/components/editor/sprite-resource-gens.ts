import { cloneDeep } from 'lodash'
import { shallowReactive, watch } from 'vue'
import { Cancelled, capture } from '@/utils/exception'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { generateSpriteContentSettings, type AnimationSettings, type CostumeSettings } from '@/apis/aigc'
import { type Files, fromConfig, toConfig } from '@/models/common/file'
import { ensureValidAnimationName, ensureValidCostumeName } from '@/models/spx/common/asset-name'
import { resourceAnimationName, resourceCostumeName } from '@/models/spx/common/resource'
import { Costume } from '@/models/spx/costume'
import { getSpriteSettings, type SpriteResourceOwner } from '@/models/spx/gen/common'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpriteResourceGen, type StoredSpriteResourceGen } from '@/models/spx/gen/sprite-resource-gen'
import type { SpxProject } from '@/models/spx/project'
import { State, type Sprite } from '@/models/spx/sprite'
import type { History } from './history'

const indexPath = 'gen/sprite-resources/index.json'

export class SpriteResourceGens extends Disposable {
  drafts = shallowReactive<SpriteResourceGen[]>([])

  constructor(
    private i18n: I18n,
    private project: SpxProject
  ) {
    super()
    // Undo and redo replace sprite instances, including sprites unrelated to the action.
    this.addDisposer(
      watch(
        () => project.sprites.slice(),
        (sprites) => {
          for (const draft of this.drafts.slice()) {
            const sprite = sprites.find((s) => s.id === draft.gen.sprite.id)
            if (sprite == null) this.remove(draft)
            else if (draft.gen.sprite !== sprite) draft.gen.parent = this.owner(sprite)
          }
        }
      )
    )
    this.addDisposer(() => this.clear())
  }

  private owner(sprite: Sprite): SpriteResourceOwner {
    const drafts = this.drafts
    return {
      previewSprite: sprite,
      get costumes() {
        return [
          ...sprite.costumes,
          ...drafts.filter((d) => d.gen.sprite === sprite && d.gen instanceof CostumeGen).map((d) => d.gen)
        ]
      },
      get animations() {
        return [
          ...sprite.animations,
          ...drafts.filter((d) => d.gen.sprite === sprite && d.gen instanceof AnimationGen).map((d) => d.gen)
        ]
      }
    }
  }

  addCostume(sprite: Sprite, settings?: CostumeSettings) {
    const owner = this.owner(sprite)
    const name = ensureValidCostumeName(settings?.name ?? this.i18n.t(resourceCostumeName) + '1', owner)
    const { artStyle, perspective } = getSpriteSettings(sprite)
    const gen = new CostumeGen(this.i18n, owner, this.project, {
      settings: { artStyle, perspective, ...settings, name },
      referenceCostumeId: sprite.defaultCostume?.id
    })
    const draft = new SpriteResourceGen(this.i18n, this.project, gen, settings != null)
    this.drafts.push(draft)
    return draft
  }

  addAnimation(sprite: Sprite, settings?: AnimationSettings, bindings: State[] = []) {
    const owner = this.owner(sprite)
    const name = ensureValidAnimationName(settings?.name ?? this.i18n.t(resourceAnimationName) + '1', owner)
    const { artStyle, perspective } = getSpriteSettings(sprite)
    const gen = new AnimationGen(this.i18n, owner, this.project, {
      settings: { artStyle, perspective, ...settings, name },
      referenceCostumeId: sprite.defaultCostume?.id
    })
    const draft = new SpriteResourceGen(this.i18n, this.project, gen, settings != null, bindings)
    this.drafts.push(draft)
    return draft
  }

  async suggest(sprite: Sprite) {
    try {
      const settings = await generateSpriteContentSettings(
        getSpriteSettings(sprite),
        this.i18n.lang.value,
        this.getSignal()
      )
      if (this.isDisposed) return
      const owner = this.project.sprites.find((s) => s.id === sprite.id)
      if (owner == null) return
      for (const costume of settings.costumes) this.addCostume(owner, costume)
      for (const animation of settings.animations) {
        const states = [State.Default, State.Step, State.Die].filter(
          (s) => settings.animationBindings?.[s] === animation.name
        )
        this.addAnimation(owner, animation, states)
      }
    } catch (err) {
      if (!this.isDisposed) capture(err, 'Failed to suggest sprite resources')
    }
  }

  historyForSprites(...spriteIds: string[]) {
    if (spriteIds.length === 0) return {}
    return { capture: () => this.capture((draft) => spriteIds.includes(draft.gen.sprite.id)) }
  }

  /** Snapshot only the drafts removed or added by a history step; other generations can keep running. */
  private capture(matches: (draft: SpriteResourceGen) => boolean) {
    const saved = this.drafts.flatMap((draft, index) => {
      if (!matches(draft)) return []
      const [config, files] = draft.export()
      return [{ index, config: cloneDeep(config), files }]
    })
    return () => {
      this.drafts.filter(matches).forEach((draft) => this.remove(draft))
      for (const { index, config, files } of saved) {
        const sprite = this.project.sprites.find((s) => s.id === config.spriteId)
        if (sprite == null) continue
        const draft = SpriteResourceGen.load(this.i18n, this.owner(sprite), this.project, config, files)
        if (draft.gen.result != null) draft.gen.resetFinishState()
        this.drafts.splice(index, 0, draft)
      }
    }
  }

  async adopt(draft: SpriteResourceGen, history: History) {
    if (draft.busy) throw new Cancelled('Generation is still running')
    const { id, gen } = draft
    const sprite = gen.sprite
    const media = gen instanceof CostumeGen ? gen.image : gen.video
    const framesConfig = gen instanceof AnimationGen ? gen.framesConfig : null
    const validate = () => {
      if (
        !this.drafts.includes(draft) ||
        draft.gen !== gen ||
        !this.project.sprites.includes(sprite) ||
        (gen instanceof CostumeGen ? gen.image !== media : gen.video !== media || gen.framesConfig !== framesConfig)
      )
        throw new Cancelled('Sprite generation changed before adoption')
    }
    validate()
    const resource = gen.result ?? (await gen.finish())
    const reference = draft.versionReferenceCostume
    const size = await reference?.getSize()
    const name =
      resource instanceof Costume ? { en: 'Add costume', zh: '添加造型' } : { en: 'Add animation', zh: '添加动画' }
    return history.doAction(
      { name, capture: () => this.capture((d) => d.id === id) },
      () => {
        // Keep the reference costume's offset from center when adding the new artwork.
        if (reference != null && size != null) {
          const delta = { x: reference.pivot.x - size.width / 2, y: reference.pivot.y - size.height / 2 }
          if (resource instanceof Costume)
            resource.setPivot({ x: resource.pivot.x + delta.x, y: resource.pivot.y + delta.y })
          else resource.applyCostumesPivotChange(delta)
        }
        if (resource instanceof Costume) {
          sprite.addCostume(resource)
          sprite.setDefaultCostume(resource.id)
        } else {
          sprite.addAnimation(resource)
          sprite.setAnimationBoundStates(resource.id, draft.boundStates, false)
        }
        this.remove(draft)
        return resource
      },
      validate
    )
  }

  remove(draft: SpriteResourceGen) {
    const index = this.drafts.indexOf(draft)
    if (index < 0) return
    this.drafts.splice(index, 1)
    draft.gen.cancel()
    draft.dispose()
  }

  private clear() {
    this.drafts.splice(0).forEach((d) => d.dispose())
  }

  export(): Files {
    if (this.drafts.length === 0) return {}
    const files: Files = {}
    const configs = this.drafts.map((d) => {
      const [config, media] = d.export()
      Object.assign(files, media)
      return config
    })
    files[indexPath] = fromConfig('index.json', configs)
    return files
  }

  async load(files: Files) {
    this.clear()
    const index = files[indexPath]
    if (index == null) return
    const configs = (await toConfig(index)) as StoredSpriteResourceGen[]
    for (const config of configs) {
      const sprite = this.project.sprites.find((s) => s.id === config.spriteId)
      if (sprite != null)
        this.drafts.push(SpriteResourceGen.load(this.i18n, this.owner(sprite), this.project, config, files))
    }
  }
}

import { isEqual } from 'lodash'
import { shallowReactive } from 'vue'
import { Cancelled, capture, DefaultException } from '@/utils/exception'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { generateSpriteContentSettings, type AnimationSettings, type CostumeSettings } from '@/apis/aigc'
import type { Size } from '@/models/common'
import { type Files, fromConfig, getImageSize, toConfig } from '@/models/common/file'
import { ensureValidAnimationName, ensureValidCostumeName } from '@/models/spx/common/asset-name'
import { resourceAnimationName, resourceCostumeName } from '@/models/spx/common/resource'
import { Costume } from '@/models/spx/costume'
import { getSpriteSettings, type SpriteResourceOwner } from '@/models/spx/gen/common'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpriteResourceGen, type StoredSpriteResourceGen } from '@/models/spx/gen/sprite-resource-gen'
import type { SpxProject } from '@/models/spx/project'
import { State, type Sprite } from '@/models/spx/sprite'
import type { Action, History } from './history'

const indexPath = 'gen/sprite-resources/index.json'

export class SpriteResourceGens extends Disposable {
  private readonly allDrafts = shallowReactive<SpriteResourceGen[]>([])

  constructor(
    private i18n: I18n,
    private project: SpxProject
  ) {
    super()
    this.addDisposer(() => this.clear())
  }

  // Project history can temporarily remove a sprite or replace its instance.
  // Its drafts stay available for redo but are only displayed and saved while it belongs to the project.
  get drafts() {
    const spriteIds = new Set(this.project.sprites.map((sprite) => sprite.id))
    return this.allDrafts.filter((draft) => spriteIds.has(draft.spriteId))
  }

  draftsFor<T extends typeof CostumeGen | typeof AnimationGen>(sprite: Sprite | null, type: T) {
    return this.allDrafts.filter(
      (draft): draft is SpriteResourceGen & { gen: InstanceType<T> } =>
        draft.spriteId === sprite?.id && draft.gen instanceof type
    )
  }

  private owner(sprite: Sprite): SpriteResourceOwner {
    const project = this.project
    const pending = (type: typeof CostumeGen | typeof AnimationGen) => this.draftsFor(sprite, type).map((d) => d.gen)
    return {
      get previewSprite() {
        return project.sprites.find((s) => s.id === sprite.id) ?? sprite
      },
      get costumes() {
        return [...this.previewSprite.costumes, ...pending(CostumeGen)]
      },
      get animations() {
        return [...this.previewSprite.animations, ...pending(AnimationGen)]
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
    this.allDrafts.push(draft)
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
    this.allDrafts.push(draft)
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

  private takeDraft(id: string) {
    const index = this.allDrafts.findIndex((draft) => draft.id === id)
    if (index === -1) return null
    const draft = this.allDrafts[index]
    const [config, files] = draft.export()
    this.remove(draft)
    return { index, config, files }
  }

  async adopt(draft: SpriteResourceGen, history: History) {
    const checkPresent = () => {
      if (!this.drafts.includes(draft)) throw new Cancelled('Draft removed')
    }
    checkPresent()
    if (draft.busy)
      throw new DefaultException({
        en: 'Wait for generation to finish before applying this version.',
        zh: '请等待生成完成后再采用。'
      })
    const { id, gen } = draft
    const media = gen instanceof CostumeGen ? gen.image : gen.video
    const framesConfig = gen instanceof AnimationGen ? gen.framesConfig : null
    const resource = gen.result ?? (await gen.finish())
    const validate = () => {
      checkPresent()
      if (
        draft.gen !== gen ||
        (gen instanceof CostumeGen
          ? gen.image !== media
          : gen.video !== media || !isEqual(gen.framesConfig, framesConfig))
      ) {
        if (gen.result === resource) gen.resetFinishState()
        throw new DefaultException({
          en: 'The result has changed. Review it and apply again.',
          zh: '生成结果已变化，请查看后重新采用。'
        })
      }
    }
    let saved: ReturnType<SpriteResourceGens['takeDraft']>
    const action: Action = {
      name:
        resource instanceof Costume ? { en: 'Add costume', zh: '添加造型' } : { en: 'Add animation', zh: '添加动画' },
      onUndo: () => {
        if (saved == null || this.isDisposed) return
        const { config, files, index } = saved
        const owner = this.project.sprites.find((s) => s.id === config.spriteId)
        if (owner == null) return
        const restored = SpriteResourceGen.load(this.i18n, this.owner(owner), this.project, config, files)
        restored.gen.resetFinishState()
        this.allDrafts.splice(index, 0, restored)
      },
      onRedo: () => {
        saved = this.takeDraft(id)
      }
    }

    const apply = (rawSize: Size | null) => {
      // Undo can restore a new sprite and reference costume backed by the same image.
      const sprite = gen.sprite
      const reference = draft.versionReferenceCostume
      if (reference != null && rawSize != null) {
        const delta = {
          x: reference.pivot.x - rawSize.width / reference.bitmapResolution / 2,
          y: reference.pivot.y - rawSize.height / reference.bitmapResolution / 2
        }
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
      saved = this.takeDraft(id)
      return resource
    }

    const referenceChanged = new Error('Reference image changed during adoption')
    while (true) {
      validate()
      const image = draft.versionReferenceCostume?.img
      let rawSize: Size | null = null
      if (image != null) {
        try {
          rawSize = await getImageSize(image)
        } catch (err) {
          if (draft.versionReferenceCostume?.img !== image) continue
          throw err
        }
      }
      try {
        return await history.doAction(
          action,
          () => apply(rawSize),
          () => {
            validate()
            if (draft.versionReferenceCostume?.img !== image) throw referenceChanged
          }
        )
      } catch (err) {
        if (err !== referenceChanged) throw err
      }
    }
  }

  remove(draft: SpriteResourceGen) {
    const index = this.allDrafts.indexOf(draft)
    if (index < 0) return
    this.allDrafts.splice(index, 1)
    draft.gen.cancel()
    draft.dispose()
  }

  private clear() {
    this.allDrafts.splice(0).forEach((d) => d.dispose())
  }

  export(): Files {
    const drafts = this.drafts
    if (drafts.length === 0) return {}
    const files: Files = {}
    const configs = drafts.map((d) => {
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
        this.allDrafts.push(SpriteResourceGen.load(this.i18n, this.owner(sprite), this.project, config, files))
    }
  }
}

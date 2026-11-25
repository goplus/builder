import { isEqual } from 'lodash'
import { shallowReactive } from 'vue'
import { Cancelled, capture, DefaultException } from '@/utils/exception'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { generateSpriteContentSettings, type AnimationSettings, type CostumeSettings } from '@/apis/aigc'
import type { Size } from '@/models/common'
import { type File, type Files, fromConfig, getImageSize, toConfig } from '@/models/common/file'
import { ensureValidAnimationName, ensureValidCostumeName } from '@/models/spx/common/asset-name'
import { resourceAnimationName, resourceCostumeName } from '@/models/spx/common/resource'
import type { Animation } from '@/models/spx/animation'
import { Costume } from '@/models/spx/costume'
import { getSpriteSettings, type SpriteResourceOwner } from '@/models/spx/gen/common'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpriteResourceGen, type StoredSpriteResourceGen } from '@/models/spx/gen/sprite-resource-gen'
import type { SpxProject } from '@/models/spx/project'
import { State, type Sprite } from '@/models/spx/sprite'
import type { Action, History } from './history'

const indexPath = 'gen/sprite-resources/index.json'

type TakenDraft = { index: number; config: StoredSpriteResourceGen; files: Files }

/** Generated media and trim that determine the result of a generation. */
function resultSource(gen: CostumeGen | AnimationGen) {
  return gen instanceof CostumeGen
    ? { media: gen.image, framesConfig: null }
    : { media: gen.video, framesConfig: gen.framesConfig }
}

type ResultSource = ReturnType<typeof resultSource>

function isSameResultSource(gen: CostumeGen | AnimationGen, source: ResultSource) {
  const current = resultSource(gen)
  return current.media === source.media && isEqual(current.framesConfig, source.framesConfig)
}

function referenceImageOf(draft: SpriteResourceGen) {
  return draft.versionReferenceCostume?.img ?? null
}

type Adoption = {
  gen: CostumeGen | AnimationGen
  source: ResultSource
  resource: Costume | Animation
  referenceImage: File | null
}

/** Keeps the reference costume's pivot offset from its image center on the generated resource. */
function alignPivot(resource: Costume | Animation, reference: Costume, rawSize: Size) {
  const size = reference.getSizeFromRaw(rawSize)
  const delta = { x: reference.pivot.x - size.width / 2, y: reference.pivot.y - size.height / 2 }
  if (resource instanceof Costume) resource.setPivot({ x: resource.pivot.x + delta.x, y: resource.pivot.y + delta.y })
  else resource.applyCostumesPivotChange(delta)
}

function addResource(sprite: Sprite, resource: Costume | Animation, boundStates: State[]) {
  if (resource instanceof Costume) {
    sprite.addCostume(resource)
    sprite.setDefaultCostume(resource.id)
  } else {
    sprite.addAnimation(resource)
    sprite.setAnimationBoundStates(resource.id, boundStates, false)
  }
}

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

  private takeDraft(id: string): TakenDraft | null {
    const index = this.allDrafts.findIndex((draft) => draft.id === id)
    if (index === -1) return null
    const draft = this.allDrafts[index]
    const [config, files] = draft.export()
    this.remove(draft)
    return { index, config, files }
  }

  private restoreDraft(taken: TakenDraft | null) {
    if (taken == null || this.isDisposed) return
    const { config, files, index } = taken
    const owner = this.project.sprites.find((s) => s.id === config.spriteId)
    if (owner == null) return
    const restored = SpriteResourceGen.load(this.i18n, this.owner(owner), this.project, config, files)
    restored.gen.resetFinishState()
    this.allDrafts.splice(index, 0, restored)
  }

  private checkPresent(draft: SpriteResourceGen) {
    if (!this.drafts.includes(draft)) throw new Cancelled('Draft removed')
  }

  /** Checks that the draft still shows what the user applied once the history lock is acquired. */
  private checkAdoption(draft: SpriteResourceGen, { gen, source, referenceImage }: Adoption) {
    this.checkPresent(draft)
    if (draft.gen !== gen || !isSameResultSource(gen, source))
      throw new DefaultException({
        en: 'The result has changed. Review it and apply again.',
        zh: '生成结果已变化，请查看后重新采用。'
      })
    if (referenceImageOf(draft) !== referenceImage)
      throw new DefaultException({
        en: 'The reference costume has changed. Apply again.',
        zh: '参考造型已变化，请重新采用。'
      })
  }

  async adopt(draft: SpriteResourceGen, history: History) {
    this.checkPresent(draft)
    if (draft.busy)
      throw new DefaultException({
        en: 'Wait for generation to finish before applying this version.',
        zh: '请等待生成完成后再采用。'
      })
    const { gen } = draft
    const source = resultSource(gen)
    const resource = gen.result ?? (await gen.finish())
    try {
      return await this.applyResource(draft, history, {
        gen,
        source,
        resource,
        referenceImage: referenceImageOf(draft)
      })
    } catch (err) {
      // A finished result keeps the draft settings read-only, so drop the result that was not applied.
      if (gen.result === resource) gen.resetFinishState()
      throw err
    }
  }

  private async applyResource(draft: SpriteResourceGen, history: History, adoption: Adoption) {
    const { id } = draft
    const { gen, resource, referenceImage } = adoption
    // Measure outside the history lock so that undo stays available while the image loads.
    const rawSize = referenceImage == null ? null : await getImageSize(referenceImage)
    let saved: TakenDraft | null = null
    const action: Action = {
      name:
        resource instanceof Costume ? { en: 'Add costume', zh: '添加造型' } : { en: 'Add animation', zh: '添加动画' },
      onUndo: () => this.restoreDraft(saved),
      onRedo: () => {
        saved = this.takeDraft(id)
      }
    }
    const apply = () => {
      // Undo can restore a new sprite and reference costume backed by the same image.
      const reference = draft.versionReferenceCostume
      if (reference != null && rawSize != null) alignPivot(resource, reference, rawSize)
      addResource(gen.sprite, resource, draft.boundStates)
      saved = this.takeDraft(id)
      return resource
    }
    return history.doAction(action, apply, () => this.checkAdoption(draft, adoption))
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

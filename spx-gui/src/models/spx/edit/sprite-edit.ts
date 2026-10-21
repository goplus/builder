import { isEqualWith } from 'lodash'
import { nanoid } from 'nanoid'
import { reactive, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { encodePathSegment } from '@/utils/path'
import { File, fromConfig, listDirs, toConfig, type Files } from '../../common/file'
import { hashFile } from '../../common/hash'
import { SpxProject } from '../project'
import { Sprite, type State } from '../sprite'
import type { Costume } from '../costume'
import { Animation } from '../animation'
import { getAnimationName, getCostumeName } from '../common/asset-name'
import { resourceAnimationName, resourceCostumeName } from '../common/resource'
import type { SpriteContent, SpriteContentSelected } from '../common/sprite-content'
import { SpriteContentHistory, type RawSpriteContentHistory } from '../common/sprite-content-history'
import { AnimationGen, type RawAnimationGenConfig } from '../gen/animation-gen'
import { CostumeGen, type RawCostumeGenConfig } from '../gen/costume-gen'
import { getSpriteSettings, Phase } from '../gen/common'
import { spriteGenAssetPath, type RawSpriteGenConfig } from '../gen/sprite-gen'

const spriteEditPath = 'edit/sprites'

function costumeState(costume: Costume) {
  return {
    name: costume.name,
    img: costume.img,
    pivot: { ...costume.pivot },
    bitmapResolution: costume.bitmapResolution,
    faceRight: costume.faceRight
  }
}

function resourceState(resource: Costume | Animation, sprite: Sprite) {
  if (!(resource instanceof Animation)) return costumeState(resource)
  return {
    name: resource.name,
    duration: resource.duration,
    sound: resource.sound,
    soundPlayback: resource.soundPlayback,
    states: sprite.getAnimationBoundStates(resource.id),
    costumes: resource.costumes.map(costumeState)
  }
}

function sameFile(a: unknown, b: unknown) {
  if (a instanceof File && b instanceof File) {
    return (
      a === b ||
      (a.meta.universalUrl != null && a.meta.universalUrl === b.meta.universalUrl) ||
      (a.meta.hash != null && a.meta.hash === b.meta.hash)
    )
  }
}

type LegacyHistory<C> = { selectedId: string; versions: Array<{ id: string; config: C }> }

type RawSpriteEditConfig = {
  id: string
  sourceSpriteId: string
  defaultCostumeId: string | null
  selectedItem: SpriteContentSelected | null
  costumeInstructions: Record<string, string>
  editHistory?: RawSpriteContentHistory
  animationInstructions?: Record<string, string>
  animationGenIdBindings: Partial<Record<State, string>>
  costumeConfigs: RawCostumeGenConfig[]
  animationConfigs: RawAnimationGenConfig[]
  // Read only: flatten drafts saved by the earlier version-history experiment.
  costumeIds?: string[]
  animationIds?: string[]
  costumeHistories?: Record<string, LegacyHistory<RawCostumeGenConfig>>
  animationHistories?: Record<string, LegacyHistory<RawAnimationGenConfig>>
}

export class SpriteEdit extends Disposable implements SpriteContent {
  editHistory: SpriteContentHistory
  id = nanoid()
  sourceSpriteId: string
  previewProject: SpxProject
  previewSprite: Sprite
  costumes: CostumeGen[] = []
  animations: AnimationGen[] = []
  selectedItem: SpriteContentSelected | null = null
  private defaultCostumeId: string | null
  private costumeInstructions: Record<string, string> = {}
  private animationInstructions: Record<string, string> = {}
  private animationGenIdBindings: Partial<Record<State, string>> = {}
  private appliedResources = new Map<string, ReturnType<typeof resourceState>>()

  private constructor(
    private i18n: I18n,
    private project: SpxProject,
    source: Sprite
  ) {
    super()
    this.editHistory = new SpriteContentHistory(
      i18n,
      project,
      this,
      () => `${spriteEditPath}/${encodePathSegment(this.sourceSpriteId)}`
    )
    this.sourceSpriteId = source.id
    for (const resource of [...source.costumes, ...source.animations]) {
      this.appliedResources.set(resource.id, resourceState(resource, source))
    }
    this.defaultCostumeId = source.defaultCostume?.id ?? null
    this.previewProject = new SpxProject()
    for (const sound of project.sounds) this.previewProject.addSound(sound.clone(true), true)
    this.previewSprite = source.clone(true)
    this.previewProject.addSprite(this.previewSprite)
    this.addDisposer(() => {
      this.previewProject.dispose()
      this.costumes.forEach((costume) => costume.dispose())
      this.animations.forEach((animation) => animation.dispose())
    })
    return reactive(this) as this
  }

  static fromSprite(i18n: I18n, project: SpxProject, source: Sprite) {
    const edit = new SpriteEdit(i18n, project, source)
    const sprite = edit.previewSprite
    const { artStyle, perspective } = getSpriteSettings(sprite)
    edit.costumes = sprite.costumes.map(
      (result) =>
        new CostumeGen(i18n, edit, project, {
          settings: { name: result.name, artStyle, perspective },
          image: result.img,
          referenceCostumeId: result.id,
          editSource: result.clone(true),
          finishPhase: new Phase({ en: 'save costume', zh: '保存造型' }, { status: 'finished', result })
        })
    )
    edit.animations = sprite.animations.map((result) => {
      const gen = new AnimationGen(i18n, edit, project, {
        settings: { name: result.name, artStyle, perspective },
        referenceCostumeId: edit.defaultCostumeId,
        editSource: result.clone(true),
        finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result })
      })
      for (const state of sprite.getAnimationBoundStates(result.id)) edit.animationGenIdBindings[state] = gen.id
      return gen
    })
    if (edit.defaultCostume != null) edit.selectedItem = { type: 'costume', id: edit.defaultCostume.id }
    edit.syncPreview()
    return edit
  }

  get name() {
    return this.previewSprite.name
  }
  get defaultCostume() {
    return this.costumes.find((costume) => costume.result?.id === this.defaultCostumeId) ?? null
  }
  getCostumeById(id: string) {
    return this.costumes.find((costume) => costume.id === id) ?? null
  }
  getAnimationById(id: string) {
    return this.animations.find((animation) => animation.id === id) ?? null
  }
  setSelectedItem(item: SpriteContentSelected | null) {
    this.selectedItem = item
  }
  getCostumeInstruction(id: string) {
    return this.costumeInstructions[id] ?? ''
  }
  setCostumeInstruction(id: string, instruction: string) {
    this.costumeInstructions[id] = instruction
  }
  getAnimationInstruction(id: string) {
    return this.animationInstructions[id] ?? ''
  }
  setAnimationInstruction(id: string, instruction: string) {
    this.animationInstructions[id] = instruction
  }

  get isBusy() {
    return (
      this.costumes.some((gen) => gen.generateState.status === 'running' || gen.finishState.status === 'running') ||
      this.animations.some((gen) => gen.generateVideoState.status === 'running' || gen.finishState.status === 'running')
    )
  }

  isNewResource(item: SpriteContentSelected) {
    const gen = item.type === 'costume' ? this.getCostumeById(item.id) : this.getAnimationById(item.id)
    return gen?.result == null || !this.appliedResources.has(gen.result.id)
  }

  hasResourceChanges(item: SpriteContentSelected) {
    const gen = item.type === 'costume' ? this.getCostumeById(item.id) : this.getAnimationById(item.id)
    if (gen == null) return false
    if (this.isNewResource(item)) return true
    if (gen instanceof AnimationGen ? gen.hasPendingVideo : gen.image !== gen.result?.img) return true
    return !isEqualWith(
      resourceState(gen.result!, this.previewSprite),
      this.appliedResources.get(gen.result!.id),
      sameFile
    )
  }

  get hasPendingChanges() {
    if (this.isBusy) return true
    return [
      ...this.costumes.map((gen) => ({ type: 'costume' as const, id: gen.id })),
      ...this.animations.map((gen) => ({ type: 'animation' as const, id: gen.id }))
    ].some(
      (item) =>
        this.hasResourceChanges(item) ||
        this.editHistory.canUndo(item.id) ||
        this.editHistory.canRedo(item.id) ||
        (item.type === 'costume'
          ? this.getCostumeInstruction(item.id)
          : this.getAnimationInstruction(item.id)
        ).trim() !== ''
    )
  }

  async editCostume(id: string, instruction: string) {
    const gen = this.getCostumeById(id)
    if (gen == null) throw new Error('Costume not found')
    this.editHistory.record(gen)
    await gen.edit(instruction)
    await gen.finish()
  }

  async editAnimation(id: string, instruction: string) {
    const gen = this.getAnimationById(id)
    if (gen == null) throw new Error('Animation not found')
    this.editHistory.record(gen)
    await gen.editVideo(instruction)
  }

  addCostume() {
    const { artStyle, perspective } = getSpriteSettings(this.previewSprite)
    const costume = new CostumeGen(this.i18n, this, this.project, {
      settings: { name: getCostumeName(this, this.i18n.t(resourceCostumeName) + '1'), artStyle, perspective },
      referenceCostumeId: this.defaultCostume?.result?.id
    })
    this.costumes.push(costume)
    return costume
  }
  removeCostume(id: string) {
    const index = this.costumes.findIndex((costume) => costume.id === id)
    if (index === -1) throw new Error(`Costume with id ${id} not found`)
    if (id === this.defaultCostume?.id) throw new Error('Cannot remove default costume')
    const [costume] = this.costumes.splice(index, 1)
    costume.cancel()
    costume.dispose()
    this.editHistory.clear(id)
    delete this.costumeInstructions[id]
    if (this.selectedItem?.type === 'costume' && this.selectedItem.id === id) this.selectedItem = null
  }
  addAnimation() {
    const { artStyle, perspective } = getSpriteSettings(this.previewSprite)
    const animation = new AnimationGen(this.i18n, this, this.project, {
      settings: { name: getAnimationName(this, this.i18n.t(resourceAnimationName) + '1'), artStyle, perspective },
      referenceCostumeId: this.defaultCostume?.result?.id
    })
    this.animations.push(animation)
    return animation
  }
  removeAnimation(id: string) {
    const index = this.animations.findIndex((animation) => animation.id === id)
    if (index === -1) throw new Error(`Animation with id ${id} not found`)
    const [animation] = this.animations.splice(index, 1)
    animation.cancel()
    animation.dispose()
    this.editHistory.clear(id)
    delete this.animationInstructions[id]
    if (this.selectedItem?.type === 'animation' && this.selectedItem.id === id) this.selectedItem = null
  }

  private syncPreview() {
    const sprite = this.previewSprite
    this.addDisposer(
      watch(
        () => this.costumes.map((costume) => costume.result).filter((costume): costume is Costume => costume != null),
        (costumes) => {
          for (const costume of sprite.costumes.slice()) {
            if (!costumes.includes(costume)) sprite.removeCostume(costume.id)
          }
          for (const costume of costumes) {
            if (!sprite.costumes.includes(costume)) sprite.addCostume(costume, true)
          }
          sprite.costumes.splice(0, sprite.costumes.length, ...costumes)
          if (this.defaultCostumeId != null && costumes.some((costume) => costume.id === this.defaultCostumeId)) {
            sprite.setDefaultCostume(this.defaultCostumeId)
          }
        },
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () =>
          this.animations
            .map((animation) => animation.result)
            .filter((animation): animation is Animation => animation != null),
        (animations, previousAnimations) => {
          const bindings = new Map(
            previousAnimations?.map((animation) => [animation.id, sprite.getAnimationBoundStates(animation.id)])
          )
          for (const animation of sprite.animations.slice()) {
            if (!animations.includes(animation)) sprite.removeAnimation(animation.id)
          }
          for (const animation of animations) {
            if (sprite.animations.includes(animation)) continue
            sprite.addAnimation(animation, true)
            const gen = this.animations.find((item) => item.result === animation)
            const states =
              bindings.get(animation.id) ??
              (Object.entries(this.animationGenIdBindings) as Array<[State, string]>)
                .filter(([, genId]) => genId === gen?.id)
                .map(([state]) => state)
            sprite.setAnimationBoundStates(animation.id, states, false)
          }
          sprite.animations.splice(0, sprite.animations.length, ...animations)
        },
        { immediate: true }
      )
    )
  }

  applyToSprite(source: Sprite, item: SpriteContentSelected) {
    if (source.id !== this.sourceSpriteId) throw new Error('Editing sprite does not match')
    if (item.type === 'costume') {
      const gen = this.getCostumeById(item.id)
      if (gen?.result == null) throw new Error('Costume not ready')
      const result = gen.result.clone(true)
      const index = source.costumes.findIndex((costume) => costume.id === result.id)
      const defaultCostumeId = source.defaultCostume?.id
      if (index >= 0) source.removeCostume(result.id)
      source.addCostume(result, true)
      if (index >= 0) source.moveCostume(source.costumes.length - 1, index)
      if (defaultCostumeId != null) source.setDefaultCostume(defaultCostumeId)
      this.appliedResources.set(result.id, resourceState(result, source))
      gen.acceptEdit()
      this.setCostumeInstruction(item.id, '')
    } else {
      const gen = this.getAnimationById(item.id)
      if (gen?.result == null) throw new Error('Animation not ready')
      const result = gen.result.clone(true)
      const index = source.animations.findIndex((animation) => animation.id === result.id)
      const states = this.previewSprite.getAnimationBoundStates(result.id)
      if (index >= 0) source.removeAnimation(result.id)
      source.addAnimation(result, true)
      if (index >= 0) source.moveAnimation(source.animations.length - 1, index)
      source.setAnimationBoundStates(result.id, states)
      this.appliedResources.set(result.id, resourceState(result, source))
      gen.acceptEdit()
      this.setAnimationInstruction(item.id, '')
    }
    this.editHistory.clear(item.id)
  }

  cancel() {
    return Promise.all([
      ...this.costumes.map((costume) => costume.cancel()),
      ...this.animations.map((animation) => animation.cancel())
    ])
  }

  export(): Files {
    const basePath = `${spriteEditPath}/${encodePathSegment(this.sourceSpriteId)}`
    const [editHistory, files] = this.editHistory.export()
    const config: RawSpriteEditConfig = {
      id: this.id,
      editHistory,
      sourceSpriteId: this.sourceSpriteId,
      defaultCostumeId: this.defaultCostumeId,
      selectedItem: this.selectedItem,
      costumeInstructions: this.costumeInstructions,
      animationInstructions: this.animationInstructions,
      animationGenIdBindings: Object.fromEntries(
        this.animations.flatMap((gen) =>
          gen.result == null
            ? []
            : this.previewSprite.getAnimationBoundStates(gen.result.id).map((state) => [state, gen.id])
        )
      ),
      costumeConfigs: this.costumes.map((costume) => {
        const [config, assets] = costume.export(basePath)
        Object.assign(files, assets)
        return config
      }),
      animationConfigs: this.animations.map((animation) => {
        const [config, assets] = animation.export(basePath)
        Object.assign(files, assets)
        return config
      })
    }
    files[`${basePath}/index.json`] = fromConfig('index.json', config)
    return files
  }

  private static loadContent(
    edit: SpriteEdit,
    config: Pick<
      RawSpriteEditConfig,
      'costumeConfigs' | 'animationConfigs' | 'costumeIds' | 'animationIds' | 'costumeHistories' | 'animationHistories'
    >,
    files: Files,
    basePath: string
  ) {
    function restore<C, G>(
      configs: C[],
      histories: Record<string, LegacyHistory<C>> | undefined,
      ids: string[] | undefined,
      load: (config: C, path: string) => G
    ) {
      if (histories == null) return configs.map((config) => load(config, basePath))
      return (ids ?? Object.keys(histories)).map((id) => {
        const history = histories[id]
        const selected = history.versions.find((version) => version.id === history.selectedId)!
        return load(selected.config, `${basePath}/versions/${selected.id}`)
      })
    }
    edit.costumes = restore(config.costumeConfigs, config.costumeHistories, config.costumeIds, (config, path) =>
      CostumeGen.load(edit.i18n, edit, edit.project, config, files, path)
    )
    edit.animations = restore(config.animationConfigs, config.animationHistories, config.animationIds, (config, path) =>
      AnimationGen.load(edit.i18n, edit, edit.project, config, files, path)
    )
    edit.syncPreview()
    return edit
  }

  static async loadAll(i18n: I18n, project: SpxProject, files: Files) {
    const loaded = await Promise.all(
      listDirs(files, spriteEditPath).map(async (id) => {
        const basePath = `${spriteEditPath}/${id}`
        const config = (await toConfig(files[`${basePath}/index.json`]!)) as RawSpriteEditConfig
        const source = project.sprites.find((sprite) => sprite.id === config.sourceSpriteId)
        if (source == null) return null
        const edit = new SpriteEdit(i18n, project, source)
        edit.id = config.id
        edit.sourceSpriteId = config.sourceSpriteId
        edit.defaultCostumeId = config.defaultCostumeId
        edit.selectedItem = config.selectedItem
        edit.costumeInstructions = config.costumeInstructions
        edit.animationInstructions = config.animationInstructions ?? {}
        edit.animationGenIdBindings = config.animationGenIdBindings
        edit.editHistory.load(config.editHistory ?? {}, files)
        return SpriteEdit.loadContent(edit, config, files, basePath)
      })
    )
    const edits = loaded.filter((edit): edit is SpriteEdit => edit != null)
    // Older builds stored edits alongside new sprite generations.
    for (const name of listDirs(files, spriteGenAssetPath)) {
      const config = (await toConfig(files[`${spriteGenAssetPath}/${name}/index.json`]!)) as RawSpriteGenConfig & {
        editingSpriteId?: string
        editingDefaultCostumeId?: string
      }
      if (config.editingSpriteId == null || edits.some((edit) => edit.sourceSpriteId === config.editingSpriteId))
        continue
      const source = project.sprites.find((sprite) => sprite.id === config.editingSpriteId)
      if (source == null) continue
      const edit = new SpriteEdit(i18n, project, source)
      edit.id = config.id ?? edit.id
      edit.defaultCostumeId = config.editingDefaultCostumeId ?? source.defaultCostume?.id ?? null
      edit.selectedItem = config.selectedItem ?? null
      edit.animationGenIdBindings = config.animationGenIdBindings ?? {}
      SpriteEdit.loadContent(
        edit,
        { costumeConfigs: config.costumeConfigs ?? [], animationConfigs: config.animationConfigs ?? [] },
        files,
        `gen/assets/sprites/${encodePathSegment(config.settings!.name!)}`
      )
      for (const costume of edit.costumes) edit.setCostumeInstruction(costume.id, costume.settings.description)
      edits.push(edit)
    }
    // Local files are recreated on load, so compare their content rather than object identity.
    await Promise.all(
      edits.map(async (edit) => {
        const source = project.sprites.find((sprite) => sprite.id === edit.sourceSpriteId)!
        const costumes = [source, edit.previewSprite].flatMap((sprite) => [
          ...sprite.costumes,
          ...sprite.animations.flatMap((animation) => animation.costumes)
        ])
        await Promise.all(costumes.map(({ img }) => (img.meta.universalUrl == null ? hashFile(img) : undefined)))
      })
    )
    return edits
  }
}

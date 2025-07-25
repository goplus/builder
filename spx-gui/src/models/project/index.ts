/**
 * @file class Project
 * @desc Object-model definition for Project
 */

import { computed, reactive, watch, type ComputedRef, toValue, effectScope } from 'vue'

import { join } from '@/utils/path'
import { debounce } from 'lodash'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import Mutex from '@/utils/mutex'
import { Cancelled } from '@/utils/exception'
import { ProgressCollector, type ProgressReporter } from '@/utils/progress'
import { Visibility, type ProjectData } from '@/apis/project'
import { toConfig, type Files, fromConfig, File } from '../common/file'
import * as cloudHelper from '../common/cloud'
import * as localHelper from '../common/local'
import * as xbpHelper from '../common/xbp'
import { assign } from '../common'
import { ensureValidSpriteName, ensureValidSoundName } from '../common/asset-name'
import { ResourceModelIdentifier, type ResourceModel } from '../common/resource-model'
import { Stage, type RawStageConfig } from '../stage'
import { Sprite } from '../sprite'
import { Sound } from '../sound'
import type { RawWidgetConfig } from '../widget'
import { History } from './history'

export type { Action } from './history'

export type CloudMetadata = Omit<ProjectData, 'latestRelease' | 'files' | 'thumbnail'> & {
  thumbnail: File | null
}

export type Metadata = Partial<CloudMetadata>

// TODO: better organization & type derivation
export type CloudProject = Project & CloudMetadata

const projectConfigFileName = 'index.json'
const projectConfigFilePath = join('assets', projectConfigFileName)

export type RunConfig = {
  width?: number
  height?: number
}

type ZorderItem = string | RawWidgetConfig

type RawProjectConfig = RawStageConfig & {
  zorder?: ZorderItem[]
  run?: RunConfig
  /**
   * Sprite order info, used by Builder to determine the order of sprites.
   * `builderSpriteOrder` is [builder-only data](https://github.com/goplus/builder/issues/714#issuecomment-2274863055), whose name should be prefixed with `builder_` as a convention.
   */
  builder_spriteOrder?: string[]
  /**
   * Sound order info, used by Builder to determine the order of sounds.
   * `builderSoundOrder` is [builder-only data](https://github.com/goplus/builder/issues/714#issuecomment-2274863055), whose name should be prefixed with `builder_` as a convention.
   */
  builder_soundOrder?: string[]
  // TODO: camera
}

export type ScreenshotTaker = (
  /** File name without extention */
  name: string,
  /** Signal for aborting the operation */
  signal?: AbortSignal
) => Promise<File>

export class Project extends Disposable {
  id?: string
  createdAt?: string
  updatedAt?: string
  owner?: string
  remixedFrom?: string | null
  name?: string
  version = 0
  visibility?: Visibility
  description?: string
  instructions?: string
  /**
   * Thumbnail image file.
   * It may not be synced with game content when project is under editing. See details in https://github.com/goplus/builder/issues/1807 .
   */
  thumbnail?: File | null
  viewCount?: number
  likeCount?: number
  releaseCount?: number
  remixCount?: number

  stage: Stage
  sprites: Sprite[]
  sounds: Sound[]
  zorder: string[]

  removeSprite(id: string) {
    const idx = this.sprites.findIndex((s) => s.id === id)
    if (idx < 0) throw new Error(`sprite ${id} not found`)
    const [sprite] = this.sprites.splice(idx, 1)
    this.zorder = this.zorder.filter((v) => v !== sprite.id)
    sprite.dispose()
  }
  /**
   * Add given sprite to project.
   * NOTE: the sprite's name may be altered to avoid conflict
   */
  addSprite(sprite: Sprite) {
    const newName = ensureValidSpriteName(sprite.name, this)
    sprite.setName(newName)
    sprite.setProject(this)
    sprite.addDisposer(() => sprite.setProject(null))
    this.sprites.push(sprite)
    if (!this.zorder.includes(sprite.id)) {
      this.zorder = [...this.zorder, sprite.id]
    }
  }
  /**
   * Move a sprite within the sprites array, without changing the sprite zorder.
   * TODO: Consider merging this with set-sprite-zorder
   */
  moveSprite(from: number, to: number) {
    if (from < 0 || from >= this.sprites.length) throw new Error(`invalid from index: ${from}`)
    if (to < 0 || to >= this.sprites.length) throw new Error(`invalid to index: ${to}`)
    if (from === to) return
    const sprite = this.sprites[from]
    this.sprites.splice(from, 1)
    this.sprites.splice(to, 0, sprite)
  }
  // TODO: Test this method
  private setSpriteZorderIdx(id: string, newIdx: number | ((idx: number, length: number) => number)) {
    const idx = this.zorder.findIndex((v) => v === id)
    if (idx < 0) throw new Error(`sprite ${id} not found in zorder`)
    const newIdxVal = typeof newIdx === 'function' ? newIdx(idx, this.zorder.length) : newIdx
    const newZorder = this.zorder.filter((v) => v !== id)
    newZorder.splice(newIdxVal, 0, id)
    this.zorder = newZorder
  }
  upSpriteZorder(id: string) {
    this.setSpriteZorderIdx(id, (i, len) => Math.min(i + 1, len - 1))
  }
  downSpriteZorder(id: string) {
    this.setSpriteZorderIdx(id, (i) => Math.max(i - 1, 0))
  }
  topSpriteZorder(id: string) {
    this.setSpriteZorderIdx(id, (_, len) => len - 1)
  }
  bottomSpriteZorder(id: string) {
    this.setSpriteZorderIdx(id, 0)
  }

  removeSound(id: string) {
    const idx = this.sounds.findIndex((s) => s.id === id)
    if (idx < 0) throw new Error(`sound ${id} not found`)
    const [sound] = this.sounds.splice(idx, 1)
    // TODO: it may be better to do `setSoundId(null)` in `Animation`, but for now it is difficult for `Animation` to know when sound is removed
    for (const sprite of this.sprites) {
      for (const animation of sprite.animations) {
        if (animation.sound === sound.id) {
          animation.setSound(null)
        }
      }
    }
    sound.dispose()
  }
  /**
   * Add given sound to project.
   * NOTE: the sound's name may be altered to avoid conflict
   */
  addSound(sound: Sound) {
    const newName = ensureValidSoundName(sound.name, this)
    sound.setName(newName)
    sound.setProject(this)
    sound.addDisposer(() => sound.setProject(null))
    this.sounds.push(sound)
  }
  /** Move a sound within the sounds array, without changing the sound zorder */
  moveSound(from: number, to: number) {
    if (from < 0 || from >= this.sounds.length) throw new Error(`invalid from index: ${from}`)
    if (to < 0 || to >= this.sounds.length) throw new Error(`invalid to index: ${to}`)
    if (from === to) return
    const sound = this.sounds[from]
    this.sounds.splice(from, 1)
    this.sounds.splice(to, 0, sound)
  }

  getResourceModel(id: ResourceModelIdentifier): ResourceModel | null {
    switch (id.type) {
      case 'stage':
        return this.stage
      case 'sprite':
        return this.sprites.find((s) => s.id === id.id) ?? null
      case 'sound':
        return this.sounds.find((s) => s.id === id.id) ?? null
      default:
        throw new Error(`unsupported resource type: ${id.type}`)
    }
  }

  setVisibility(visibility: Visibility) {
    this.visibility = visibility
  }

  setDescription(description: string) {
    this.description = description
  }

  setInstructions(instructions: string) {
    this.instructions = instructions
  }

  history: History // TODO: move to state `Editing`
  historyMutex = new Mutex() // TODO: rename to some "atomic mutex", used to ensure atomicity of project operations

  // In project editor, we use `bindScreenshotTaker` to register a screenshot taker and
  // update thumbnail automatically. That way, the thumbnail will always reflect the latest changes
  // made to the project (game) content. While there're issues with the current flow,
  // see details in https://github.com/goplus/builder/issues/1807 . TODO: improve the flow.

  private screenshotTaker: ScreenshotTaker | null = null

  private updateThumbnail = debounce(async (signal?: AbortSignal) => {
    try {
      const reactiveThis = reactive(this) as this
      if (reactiveThis.screenshotTaker == null) return
      reactiveThis.thumbnail = await reactiveThis.screenshotTaker('thumbnail', signal)
    } catch (e) {
      if (e instanceof Cancelled) return
      console.warn('failed to update thumbnail', e)
    }
  }, 300)

  bindScreenshotTaker(st: ScreenshotTaker) {
    if (this.screenshotTaker != null) throw new Error('screenshotTaker already bound')
    const disposable = new Disposable()

    this.screenshotTaker = st
    disposable.addDisposer(() => (this.screenshotTaker = null))

    // Use detached scope to prevent vue component setup from capturing watch-effects below, which are expected to be handled by `bindScreenshotTaker` itself.
    // If not, error `TypeError: Cannot read properties of undefined (reading 'stop')` will be thrown when component unmounted.
    // TODO: we may extract this pattern as a method of class `Disposable`, e.g. `runWithDetachedEffectScope`, to simplify the usage.
    const scope = effectScope(true)
    scope.run(() =>
      watch(
        () => this.exportGameFiles(),
        (_, __, onCleanup) => this.updateThumbnail(getCleanupSignal(onCleanup)),
        { immediate: true }
      )
    )
    disposable.addDisposer(() => scope.stop())

    this.addDisposable(disposable)
    return () => disposable.dispose()
  }

  constructor(owner?: string, name?: string) {
    super()
    const reactiveThis = reactive(this) as this
    this.owner = owner
    this.name = name
    this.history = new History(reactiveThis)
    this.zorder = []
    this.stage = new Stage()
    this.sprites = []
    this.sounds = []
    this.addDisposer(() => {
      this.sprites.splice(0).forEach((s) => s.dispose())
      this.sounds.splice(0).forEach((s) => s.dispose())
      this.zorder = []
      this.stage.dispose()
    })
    this.exportGameFilesComputed = computed(() => reactiveThis.exportGameFilesWithoutMemo())
    return reactiveThis
  }

  private loadMetadata(metadata: Metadata) {
    assign<Project>(this, metadata)
  }

  private exportMetadata(): Metadata {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      owner: this.owner,
      name: this.name,
      version: this.version,
      visibility: this.visibility,
      description: this.description,
      instructions: this.instructions,
      thumbnail: this.thumbnail
    }
  }

  async loadGameFiles(files: Files) {
    const configFile = files[projectConfigFilePath]
    const config: RawProjectConfig = {}
    if (configFile != null) {
      Object.assign(config, await toConfig(configFile))
    }
    const {
      zorder: rawZorder,
      builder_spriteOrder: spriteOrder,
      builder_soundOrder: soundOrder,
      ...rawStageConfig
    } = config

    const sounds = await Sound.loadAll(files)
    const sprites = await Sprite.loadAll(files, { sounds })

    const widgets: RawWidgetConfig[] = []
    const zorder: string[] = []
    rawZorder?.forEach((item) => {
      if (typeof item === 'string') {
        // `item` is a sprite name
        const id = sprites.find((s) => s.name === item)?.id
        if (id == null) {
          console.warn(`sprite ${item} not found`)
          return
        }
        zorder.push(id)
      } else {
        // `item` is a widget config
        widgets.push(item)
      }
    })

    const stageConfig = { ...rawStageConfig, widgets }
    const stage = await Stage.load(stageConfig, files)

    this.stage = stage
    this.sprites.splice(0).forEach((s) => s.dispose())
    orderBy(sprites, spriteOrder).forEach((s) => this.addSprite(s))
    this.sounds.splice(0).forEach((s) => s.dispose())
    orderBy(sounds, soundOrder).forEach((s) => this.addSound(s))
    this.zorder = zorder ?? []
  }

  private exportGameFilesWithoutMemo(): Files {
    const files: Files = {}
    const [stageConfig, stageFiles] = this.stage.export()
    const { widgets, ...restStageConfig } = stageConfig
    const zorderNames = this.zorder.map((id) => {
      const sprite = this.sprites.find((s) => s.id === id)
      if (sprite == null) throw new Error(`sprite ${id} not found`)
      return sprite.name
    })
    const config: RawProjectConfig = {
      ...restStageConfig,
      run: {
        // TODO: we should not hard code the width & height here,
        // instead we should use the runtime size of component `ProjectRunner`,
        // after https://github.com/goplus/builder/issues/584
        width: stageConfig.map?.width,
        height: stageConfig.map?.height
      },
      zorder: [...zorderNames, ...(widgets ?? [])],
      builder_spriteOrder: this.sprites.map((s) => s.id),
      builder_soundOrder: this.sounds.map((s) => s.id)
    }
    files[projectConfigFilePath] = fromConfig(projectConfigFileName, config)
    Object.assign(files, stageFiles)
    Object.assign(files, ...this.sprites.map((s) => s.export({ sounds: this.sounds })))
    Object.assign(files, ...this.sounds.map((s) => s.export()))
    return files
  }

  // Use a computed ref to avoid unnecessary re-computation when the game content is not changed.
  private exportGameFilesComputed: ComputedRef<Files>

  /**
   * Export game files.
   * By watching result of this method, you can get notified when game content changed.
   */
  exportGameFiles() {
    return toValue(this.exportGameFilesComputed)
  }

  /** Load with metadata & game files */
  async load(metadata: Metadata, files: Files) {
    this.loadMetadata(metadata)
    await this.loadGameFiles(files)
  }

  /** Export metadata & game files */
  async export(): Promise<[Metadata, Files]> {
    return this.historyMutex.runExclusive(async () => {
      // Do flush pending thumbnail updates to ensure the exported thumbnail up-to-date.
      // So the caller of `export` (cloud-saving, local-saving, xbp-exporting, etc.) always get the latest thumbnail.
      // For more details, see https://github.com/goplus/builder/issues/1807 .
      await this.updateThumbnail.flush()
      return [this.exportMetadata(), this.exportGameFiles()]
    })
  }

  async loadXbpFile(file: globalThis.File) {
    const { metadata, files } = await xbpHelper.load(file)
    await this.load(metadata, files)
  }

  async exportXbpFile() {
    const [metadata, files] = await this.export()
    return await xbpHelper.save(metadata, files)
  }

  /** Load from cloud */
  async loadFromCloud(
    owner: string,
    name: string,
    preferPublishedContent: boolean = false,
    signal?: AbortSignal,
    reporter?: ProgressReporter
  ) {
    const collector = reporter != null ? ProgressCollector.collectorFor(reporter) : null
    const cloudLoadReporter = collector?.getSubReporter(
      { en: 'Downloading project info...', zh: '正在下载项目信息...' },
      1
    )
    const projectLoadReporter = collector?.getSubReporter({ en: 'Loading project...', zh: '正在载入项目...' }, 1)

    const { metadata, files } = await cloudHelper.load(owner, name, preferPublishedContent, signal)
    signal?.throwIfAborted()
    cloudLoadReporter?.report(1)

    await this.load(metadata, files)
    signal?.throwIfAborted()
    projectLoadReporter?.report(1)

    return this as CloudProject
  }

  async saveToCloud(signal?: AbortSignal) {
    if (this.isDisposed) throw new Error('disposed')
    const [metadata, files] = await this.export()
    const saved = await cloudHelper.save(metadata, files, signal)
    this.loadMetadata(saved.metadata)
  }

  /** Load from local cache */
  async loadFromLocalCache(key: string) {
    const cached = await localHelper.load(key)
    if (cached == null) throw new Error('no project in local cache')
    const { metadata, files } = cached
    await this.load(metadata, files)
  }

  /** Save to local cache */
  async saveToLocalCache(key: string) {
    if (this.isDisposed) throw new Error('disposed')
    const [metadata, files] = await this.export()
    await localHelper.save(key, metadata, files)
  }
}

/** Get full name for project, which stands for a globally unique identifier for the project */
export function fullName(owner: string, name: string) {
  return `${owner}/${name}`
}

function orderBy<T extends Sprite | Sound>(list: T[], order: string[] | undefined) {
  if (order == null) return list
  return list.slice().sort((a, b) => {
    return order.indexOf(a.id) - order.indexOf(b.id)
  })
}

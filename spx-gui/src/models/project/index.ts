/**
 * @file class Project
 * @desc Object-model definition for Project
 */

import { reactive, watch } from 'vue'

import { join } from '@/utils/path'
import { debounce } from 'lodash'
import { Disposable } from '@/utils/disposable'
import { Visibility, type ProjectData } from '@/apis/project'
import { toConfig, type Files, fromConfig, File } from '../common/file'
import * as cloudHelper from '../common/cloud'
import * as localHelper from '../common/local'
import * as gbpHelper from '../common/gbp'
import { hashFiles } from '../common/hash'
import { assign } from '../common'
import { ensureValidSpriteName, ensureValidSoundName } from '../common/asset-name'
import { Stage, type RawStageConfig } from '../stage'
import { Sprite } from '../sprite'
import { Sound } from '../sound'
import type { RawWidgetConfig } from '../widget'
import { History } from './history'
import Mutex from '@/utils/mutex'
import { Cancelled } from '@/utils/exception'
import { until, untilNotNull } from '@/utils/utils'

export type { Action } from './history'

export type CloudMetadata = Omit<ProjectData, 'files'>

export type Metadata = Partial<CloudMetadata> & {
  filesHash?: string
  lastSyncedFilesHash?: string
}

// TODO: better organization & type derivation
export type CloudProject = Project & CloudMetadata

const projectConfigFileName = 'index.json'
const projectConfigFilePath = join('assets', projectConfigFileName)

export type Selected =
  | {
      type: 'sprite'
      id: string
    }
  | {
      type: 'sound'
      id: string
    }
  | {
      type: 'stage'
    }
  | null

export type RunConfig = {
  width?: number
  height?: number
}

export enum AutoSaveMode {
  Off,
  Cloud,
  LocalCache
}

export enum AutoSaveToCloudState {
  Saved,
  Pending,
  Saving,
  Failed
}

type ZorderItem = string | RawWidgetConfig

type RawProjectConfig = RawStageConfig & {
  zorder?: ZorderItem[]
  run?: RunConfig
  /**
   * Sprite order info, used by Go+ Builder to determine the order of sprites.
   * `builderSpriteOrder` is [builder-only data](https://github.com/goplus/builder/issues/714#issuecomment-2274863055), whose name should be prefixed with `builder_` as a convention.
   */
  builder_spriteOrder?: string[]
  /**
   * Sound order info, used by Go+ Builder to determine the order of sounds.
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
  /** Universal URL of the project's thumbnail image, may be empty (`""`) */
  thumbnail?: string
  viewCount?: number
  likeCount?: number
  releaseCount?: number
  remixCount?: number

  private filesHash?: string
  private lastSyncedFilesHash?: string
  /** If there is any change of game content not synced (to cloud) yet. */
  get hasUnsyncedChanges() {
    // if filesHash is null, it means editing not started yet
    if (this.filesHash == null) return false
    return this.lastSyncedFilesHash !== this.filesHash
  }

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
    this.autoSelect()
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
  // TODO: Test this method
  private setSpriteZorderIdx(
    id: string,
    newIdx: number | ((idx: number, length: number) => number)
  ) {
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
    this.autoSelect()
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

  setVisibility(visibility: Visibility) {
    this.visibility = visibility
  }

  setDescription(description: string) {
    this.description = description
  }

  setInstructions(instructions: string) {
    this.instructions = instructions
  }

  selected: Selected = null

  get selectedSprite() {
    const { selected, sprites } = this
    if (selected?.type !== 'sprite') return null
    return sprites.find((s) => s.id === selected.id) ?? null
  }

  get selectedSound() {
    const { selected, sounds } = this
    if (selected?.type !== 'sound') return null
    return sounds.find((s) => s.id === selected.id) ?? null
  }

  select(selected: Selected) {
    this.selected = selected
  }

  /**
   * Check if current selected target is valid. If not, select some target automatically.
   * Targets with the same type are preferred.
   */
  private autoSelect() {
    const selected = this.selected
    if (selected?.type === 'stage') return
    if (selected?.type === 'sound' && this.selectedSound == null && this.sounds[0] != null) {
      this.select({ type: 'sound', id: this.sounds[0].id })
      return
    }
    if (this.selectedSprite == null) {
      this.select(this.sprites[0] != null ? { type: 'sprite', id: this.sprites[0].id } : null)
    }
  }

  history: History
  historyMutex = new Mutex()

  private screenshotTaker: ScreenshotTaker | null = null
  bindScreenshotTaker(st: ScreenshotTaker) {
    if (this.screenshotTaker != null) throw new Error('screenshotTaker already bound')
    this.screenshotTaker = st
    return () => {
      if (this.screenshotTaker === st) {
        this.screenshotTaker = null
      }
    }
  }

  private async ensureThumbnail(signal?: AbortSignal) {
    if (!this.hasUnsyncedChanges && !!this.thumbnail) return
    const screenshotTaker = await untilNotNull(() => this.screenshotTaker, signal)
    const file = await screenshotTaker('thumbnail', signal)
    signal?.throwIfAborted()
    const url = await cloudHelper.saveFile(file, signal)
    this.thumbnail = url
  }

  constructor() {
    super()
    const reactiveThis = reactive(this) as this
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
      thumbnail: this.thumbnail,
      filesHash: this.filesHash,
      lastSyncedFilesHash: this.lastSyncedFilesHash
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
    const sprites = await Sprite.loadAll(files, sounds)

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
    this.autoSelect()
  }

  exportGameFiles(): Files {
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

  /** Load with metadata & game files */
  async load(metadata: Metadata, files: Files) {
    this.loadMetadata(metadata)
    await this.loadGameFiles(files)
  }

  /** Export metadata & game files */
  async export(): Promise<[Metadata, Files]> {
    return this.historyMutex.runExclusive(() => [this.exportMetadata(), this.exportGameFiles()])
  }

  async loadGbpFile(file: globalThis.File) {
    const { metadata, files } = await gbpHelper.load(file)
    await this.load(
      {
        // name is the only metadata we need when load from file
        name: this.name ?? metadata.name
      },
      files
    )
  }

  async exportGbpFile() {
    const [metadata, files] = await this.export()
    return await gbpHelper.save(metadata, files)
  }

  /** Load from cloud */
  async loadFromCloud(owner: string, name: string, signal?: AbortSignal) {
    const { metadata, files } = await cloudHelper.load(owner, name, signal)
    signal?.throwIfAborted()
    await this.load(metadata, files)
    return this as CloudProject
  }

  /** Save to cloud */
  private saveToCloudAbortController: AbortController | null = null
  private get isSavingToCloud() {
    return this.saveToCloudAbortController != null
  }
  async saveToCloud() {
    if (this.saveToCloudAbortController != null) {
      this.saveToCloudAbortController.abort(new Cancelled('aborted'))
    }
    const abortController = new AbortController()
    this.saveToCloudAbortController = abortController

    try {
      if (this.isDisposed) throw new Error('disposed')
      await this.ensureThumbnail(abortController.signal)
      const [metadata, files] = await this.export()
      const saved = await cloudHelper.save(metadata, files, abortController.signal)
      this.loadMetadata(saved.metadata)
      this.lastSyncedFilesHash = await hashFiles(files)
    } finally {
      if (this.saveToCloudAbortController === abortController) {
        this.saveToCloudAbortController = null
      }
    }
  }

  /** Load from local cache */
  async loadFromLocalCache(key: string) {
    const cached = await localHelper.load(key)
    if (cached == null) throw new Error('no project in local cache')
    const { metadata, files } = cached
    await this.load(metadata, files)
  }

  /** Save to local cache */
  private async saveToLocalCache(key: string) {
    if (this.isDisposed) throw new Error('disposed')
    const [metadata, files] = await this.export()
    await localHelper.save(key, metadata, files)
  }

  autoSaveMode = AutoSaveMode.Off
  setAutoSaveMode(autoSaveMode: AutoSaveMode) {
    this.autoSaveMode = autoSaveMode
    switch (autoSaveMode) {
      case AutoSaveMode.Cloud:
        if (this.hasUnsyncedChanges) this.autoSaveToCloud?.()
        break
      case AutoSaveMode.LocalCache:
        this.autoSaveToLocalCache?.()
        break
    }
  }

  /** watch for changes of game files, update filesHash, and auto save to cloud if hasUnsyncedChanges */
  autoSaveToCloudState = AutoSaveToCloudState.Saved
  private autoSaveToCloud: (() => void) | null = null
  private startAutoSaveToCloud(localCacheKey: string) {
    const retryAutoSaveToCloud = debounce(async () => {
      if (this.autoSaveToCloudState !== AutoSaveToCloudState.Failed) return
      if (this.hasUnsyncedChanges) {
        this.autoSaveToCloud?.()
      } else {
        this.autoSaveToCloudState = AutoSaveToCloudState.Saved
        await localHelper.clear(localCacheKey)
      }
    }, 5000)
    this.addDisposer(retryAutoSaveToCloud.cancel)

    const saveToCloud = debounce(async () => {
      if (this.autoSaveToCloudState !== AutoSaveToCloudState.Pending) return
      this.autoSaveToCloudState = AutoSaveToCloudState.Saving

      try {
        if (this.isSavingToCloud) {
          await until(() => !this.isSavingToCloud)
        }

        if (this.hasUnsyncedChanges) await this.saveToCloud()
        this.autoSaveToCloudState = AutoSaveToCloudState.Saved
      } catch (e) {
        this.autoSaveToCloudState = AutoSaveToCloudState.Failed
        if (e instanceof Cancelled) {
          this.autoSaveToCloud?.()
          saveToCloud.flush()
        } else {
          retryAutoSaveToCloud()
          await this.saveToLocalCache(localCacheKey) // prevent data loss
          console.error('failed to auto save to cloud', e)
        }
        return
      }

      if (this.hasUnsyncedChanges) this.autoSaveToCloud?.()
      else await localHelper.clear(localCacheKey)
    }, 1500)
    this.addDisposer(saveToCloud.cancel)

    this.autoSaveToCloud = () => {
      retryAutoSaveToCloud.cancel()
      if (this.autoSaveToCloudState !== AutoSaveToCloudState.Saving)
        this.autoSaveToCloudState = AutoSaveToCloudState.Pending
      if (this.autoSaveMode === AutoSaveMode.Cloud) saveToCloud()
    }

    this.addDisposer(
      watch(
        () => this.exportGameFiles(),
        async (files, _, onCleanup) => {
          let cancelled = false
          onCleanup(() => (cancelled = true))
          const filesHash = await hashFiles(files)
          if (cancelled) return // avoid race condition and ensure filesHash accuracy
          this.filesHash = filesHash
          if (this.hasUnsyncedChanges) this.autoSaveToCloud?.()
        },
        { immediate: true }
      )
    )

    // fire pending or retryable auto saves immediately when a new save occurs, making autoSaveToCloudState more responsive
    this.addDisposer(
      watch(
        () => this.isSavingToCloud,
        async () => {
          if (this.isSavingToCloud) {
            await retryAutoSaveToCloud.flush()
            saveToCloud.flush()
          }
        },
        { immediate: true }
      )
    )
  }

  /** watch for all changes, auto save to local cache, or touch all game files to trigger lazy loading to ensure they are in memory */
  private autoSaveToLocalCache: (() => void) | null = null
  private startAutoSaveToLocalCache(localCacheKey: string) {
    const saveToLocalCache = debounce(() => this.saveToLocalCache(localCacheKey), 1000)
    this.addDisposer(saveToLocalCache.cancel)

    const touchGameFiles = debounce(() => {
      const files = this.exportGameFiles()
      Object.keys(files).map((path) => files[path]!.arrayBuffer())
    }, 1000)
    this.addDisposer(touchGameFiles.cancel)

    this.autoSaveToLocalCache = () => {
      if (this.autoSaveMode === AutoSaveMode.LocalCache) saveToLocalCache()
      else touchGameFiles()
    }

    this.addDisposer(
      watch(
        () => [this.exportMetadata(), this.exportGameFiles()],
        () => this.autoSaveToLocalCache?.(),
        {
          immediate: true
        }
      )
    )
  }

  /** Initialize editing features */
  async startEditing(localCacheKey: string) {
    this.filesHash = await hashFiles(this.exportGameFiles())
    if (this.lastSyncedFilesHash == null) {
      this.lastSyncedFilesHash = this.filesHash
    }
    this.startAutoSaveToCloud(localCacheKey)
    this.startAutoSaveToLocalCache(localCacheKey)

    this.addDisposer(
      watch(
        // new created project has no thumbnail, do save to cloud to generate thumbnail
        () => this.thumbnail === '' && this.autoSaveMode === AutoSaveMode.Cloud,
        (shouldGenerateThumbnail) => {
          if (shouldGenerateThumbnail) this.saveToCloud?.()
        },
        { immediate: true }
      )
    )
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

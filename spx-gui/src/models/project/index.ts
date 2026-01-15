/**
 * @file class Project
 * @desc Object-model definition for Project
 */

import { computed, reactive, watch, type ComputedRef, toValue, effectScope } from 'vue'

import { join } from '@/utils/path'
import { debounce } from 'lodash'
import type { Prettify } from '@/utils/types'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import Mutex from '@/utils/mutex'
import { Cancelled } from '@/utils/exception'
import { ProgressCollector, type ProgressReporter } from '@/utils/progress'
import { Visibility, type ProjectData, type ProjectExtraSettings } from '@/apis/project'
import { toConfig, type Files, fromConfig, File, toText, getImageSize } from '../common/file'
import * as cloudHelper from '../common/cloud'
import * as localHelper from '../common/local'
import * as xbpHelper from '../common/xbp'
import { assign } from '../common'
import { ensureValidSpriteName, ensureValidSoundName } from '../common/asset-name'
import { ResourceModelIdentifier, type ResourceModel } from '../common/resource-model'
import { generateAIDescription } from '@/apis/ai-description'
import { hashFiles } from '../common/hash'
import { isProjectUsingAIInteraction } from '@/utils/project'
import { defaultMapSize, Stage, type RawStageConfig } from '../stage'
import { DumbTilemap as Tilemap } from '../tilemap'
import { Sprite } from '../sprite'
import { Sound } from '../sound'
import type { RawWidgetConfig } from '../widget'
import { History } from './history'

export type { Action } from './history'

export type CloudMetadata = Prettify<
  Omit<ProjectData, 'latestRelease' | 'files' | 'thumbnail'> & {
    thumbnail: File | null
  }
>

export type Metadata = Prettify<
  Partial<CloudMetadata> & {
    aiDescription?: string | null
    aiDescriptionHash?: string | null
  }
>

/**
 * A Project loaded from cloud.
 * TODO: better organization & type derivation
 */
export type CloudProject = Project & CloudMetadata

const projectConfigFileName = 'index.json'
const assetsDir = 'assets'
export const projectConfigFilePath = join(assetsDir, projectConfigFileName)

const aiDescriptionMaxContentLength = 150_000 // Keep in sync with maxContentLength in spx-backend/internal/controller/aidescription.go
const aiDescriptionTruncationNotice = '\n[TRUNCATED]\n'
const mainFileMaxLength = 60_000
const spriteFileMaxLength = 20_000
const projectConfigMaxLength = 15_000
const spriteConfigMaxLength = 5_000

type RawRunConfig = {
  width?: number
  height?: number
}

type RawAudioAttenuationConfig = {
  audioAttenuation?: number
  audioMaxDistance?: number
}

type RawCameraConfig = {
  /** Name of sprite to follow. Empty string means no following. */
  on: string
}

type ZorderItem = string | RawWidgetConfig

export type RawProjectConfig = RawStageConfig &
  RawAudioAttenuationConfig & {
    zorder?: ZorderItem[]
    run?: RawRunConfig
    camera?: RawCameraConfig
    tilemapPath?: string
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
  }

export type ScreenshotTaker = (
  /** File name without extention */
  name: string,
  /** Signal for aborting the operation */
  signal?: AbortSignal
) => Promise<File>

export type ViewportSize = {
  width: number
  height: number
}

const defaultViewportSize: ViewportSize = defaultMapSize
const maxAudioAttenuationViewportScale = 1.6 // The maximum scaling factor for the viewport
const disabledAudioAttenuationFlag = 0

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
  extraSettings?: ProjectExtraSettings
  viewCount?: number
  likeCount?: number
  releaseCount?: number
  remixCount?: number

  stage: Stage
  tilemap?: Tilemap | null
  sprites: Sprite[]
  sounds: Sound[]
  zorder: string[]

  private aiDescription: string | null
  private aiDescriptionHash: string | null

  removeSprite(id: string) {
    const idx = this.sprites.findIndex((s) => s.id === id)
    if (idx < 0) throw new Error(`sprite ${id} not found`)
    const [sprite] = this.sprites.splice(idx, 1)
    this.zorder = this.zorder.filter((v) => v !== sprite.id)
    if (this.cameraFollowSpriteId === sprite.id) this.cameraFollowSpriteId = null
    sprite.dispose()
  }
  private prepareAddSprite(sprite: Sprite) {
    const newName = ensureValidSpriteName(sprite.name, this)
    sprite.setName(newName)
    sprite.setProject(this)
    sprite.addDisposer(() => sprite.setProject(null))
  }
  /**
   * Add given sprite to project.
   * NOTE: the sprite's name may be altered to avoid conflict
   */
  addSprite(sprite: Sprite) {
    this.prepareAddSprite(sprite)
    this.sprites.push(sprite)
    if (!this.zorder.includes(sprite.id)) {
      this.zorder = [...this.zorder, sprite.id]
    }
  }
  /**
   * Add a sprite after the specified reference sprite.
   */
  addSpriteAfter(
    /** Sprite to be added */
    sprite: Sprite,
    /** ID of the reference sprite */
    referenceId: string
  ) {
    const index = this.sprites.findIndex((s) => s.id === referenceId) // ensure referenceId exists
    if (index === -1) throw new Error(`sprite ${referenceId} not found`)

    this.prepareAddSprite(sprite)
    this.sprites.splice(index + 1, 0, sprite)
    if (!this.zorder.includes(sprite.id)) {
      const idx = this.zorder.indexOf(referenceId)
      if (idx === -1) this.zorder.push(sprite.id)
      else this.zorder.splice(idx + 1, 0, sprite.id)
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
  private prepareAddSound(sound: Sound) {
    const newName = ensureValidSoundName(sound.name, this)
    sound.setName(newName)
    sound.setProject(this)
    sound.addDisposer(() => sound.setProject(null))
  }
  /**
   * Add given sound to project.
   * NOTE: the sound's name may be altered to avoid conflict
   */
  addSound(sound: Sound) {
    this.prepareAddSound(sound)
    this.sounds.push(sound)
  }
  /**
   * Add a sound after the specified reference sound.
   */
  addSoundAfter(
    /** Sound to be added */
    sound: Sound,
    /** ID of the reference sound */
    referenceId: string
  ) {
    const index = this.sounds.findIndex((s) => s.id === referenceId) // ensure referenceId exists
    if (index === -1) throw new Error(`sound ${referenceId} not found`)

    this.prepareAddSound(sound)
    this.sounds.splice(index + 1, 0, sound)
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

  readonly viewportSize = defaultViewportSize

  private cameraFollowSpriteId: string | null
  get cameraFollowSprite(): Sprite | null {
    if (this.cameraFollowSpriteId == null) return null
    return this.sprites.find((s) => s.id === this.cameraFollowSpriteId) ?? null
  }
  setCameraFollowSprite(spriteId: string | null) {
    this.cameraFollowSpriteId = spriteId
  }

  /**
   * Camera is considered enabled if the map size is larger than viewport size.
   * To keep backward-compatibility, we optionally enables other camera-related features
   * (e.g. audio attenuation, camera following) by checking this flag.
   */
  get isCameraEnabled() {
    const mapSize = this.stage.getMapSize()
    const viewport = this.viewportSize
    return mapSize.width > viewport.width || mapSize.height > viewport.height
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
      this.tilemap?.dispose()
      this.tilemap = null
    })
    this.cameraFollowSpriteId = null
    this.aiDescription = null
    this.aiDescriptionHash = null
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
      thumbnail: this.thumbnail,
      aiDescription: this.aiDescription,
      aiDescriptionHash: this.aiDescriptionHash
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
      // For now runConfig will be ignored, as the fixed viewport / run size is used in builder
      // TODO: support customized viewport / run size
      run: runConfig,
      camera: cameraConfig,
      builder_spriteOrder: spriteOrder,
      builder_soundOrder: soundOrder,
      tilemapPath,
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

    this.stage.dispose()
    const stageConfig = { ...rawStageConfig, widgets }
    const stage = await Stage.load(stageConfig, files)

    this.stage = stage
    this.sprites.splice(0).forEach((s) => s.dispose())
    orderBy(sprites, spriteOrder).forEach((s) => this.addSprite(s))
    this.sounds.splice(0).forEach((s) => s.dispose())
    orderBy(sounds, soundOrder).forEach((s) => this.addSound(s))
    this.zorder = zorder ?? []

    this.tilemap?.dispose()
    this.tilemap = tilemapPath != null ? await Tilemap.load(tilemapPath, assetsDir, files) : null

    // Set camera-follow-sprite
    let cameraFollowSprite: Sprite | null = null
    const cameraOn = cameraConfig?.on || null
    if (cameraOn != null) cameraFollowSprite = this.sprites.find((s) => s.name === cameraOn) ?? null
    this.cameraFollowSpriteId = cameraFollowSprite?.id || null
  }

  private exportGameFilesWithoutMemo(): Files {
    const files: Files = {}
    const [stageConfig, stageFiles] = this.stage.export()
    const { widgets, ...restStageConfig } = stageConfig

    const tilemap = this.tilemap
    if (tilemap != null) {
      const tileFiles = tilemap.export(assetsDir)
      Object.assign(files, tileFiles)
    }

    const zorderNames = this.zorder.map((id) => {
      const sprite = this.sprites.find((s) => s.id === id)
      if (sprite == null) throw new Error(`sprite ${id} not found`)
      return sprite.name
    })
    const { width, height } = this.viewportSize
    const config: RawProjectConfig = {
      ...restStageConfig,
      audioAttenuation: this.isCameraEnabled ? 1 : disabledAudioAttenuationFlag, // Enable audio attenuation only when the map is larger than viewport
      audioMaxDistance: Math.max(width, height) * maxAudioAttenuationViewportScale, // Always export audioMaxDistance config for backward-compatibility
      run: { width, height },
      camera: {
        on: this.cameraFollowSprite?.name || ''
      },
      tilemapPath: tilemap?.tilemapPath,
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
  async export(signal?: AbortSignal): Promise<[Metadata, Files]> {
    return this.historyMutex.runExclusive(async () => {
      // Do flush pending thumbnail updates to ensure the exported thumbnail up-to-date.
      // So the caller of `export` (cloud-saving, local-saving, xbp-exporting, etc.) always get the latest thumbnail.
      // For more details, see https://github.com/goplus/builder/issues/1807 .
      await this.updateThumbnail.flush()
      if (isProjectUsingAIInteraction(this)) await this.ensureAIDescription(undefined, signal) // Ensure AI description is available if needed
      return [this.exportMetadata(), this.exportGameFiles()]
    })
  }

  async loadXbpFile(file: globalThis.File) {
    const { metadata, files } = await xbpHelper.load(file)
    await this.load(metadata, files)
  }

  async exportXbpFile(signal?: AbortSignal) {
    const [metadata, files] = await this.export(signal)
    return await xbpHelper.save(metadata, files, signal)
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
    if (isProjectUsingAIInteraction(this)) await this.ensureAIDescription(false, signal) // Ensure AI description is available if needed
    const [metadata, files] = await this.export(signal)
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
  async saveToLocalCache(key: string, signal?: AbortSignal) {
    if (this.isDisposed) throw new Error('disposed')
    const [metadata, files] = await this.export(signal)
    await localHelper.save(key, metadata, files, signal)
  }

  /** Ensure AI description is available */
  async ensureAIDescription(checkForUpdate = false, signal?: AbortSignal) {
    if (this.aiDescription != null && !checkForUpdate) return this.aiDescription

    const files = this.exportGameFiles()
    const currentHash = await hashFiles(files, signal)

    // Generate or update if necessary
    if (this.aiDescription == null || this.aiDescriptionHash !== currentHash) {
      try {
        const content = await this.serializeForAI()
        this.aiDescription = await generateAIDescription(content, signal)
        this.aiDescriptionHash = currentHash
      } catch (e) {
        if (e instanceof Cancelled) throw e
        throw new Error(`failed to generate AI description: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return this.aiDescription
  }

  /** Serialize for AI use */
  private async serializeForAI() {
    const files = this.exportGameFiles()
    let remaining = aiDescriptionMaxContentLength
    let result = ''
    const skippedSections: string[] = []

    const append = (value: string) => {
      if (value.length === 0 || remaining <= 0) return remaining > 0
      const toWrite = Math.min(value.length, remaining)
      result += value.slice(0, toWrite)
      remaining -= toWrite
      return toWrite === value.length
    }
    const appendLine = (line: string) => append(`${line}\n`)
    const appendBlankLine = () => append('\n')

    const appendBody = (body: string) => {
      if (body.length === 0) return true
      if (body.length <= remaining) {
        return append(body)
      }
      if (remaining < aiDescriptionTruncationNotice.length) {
        return false
      }
      const allowedLength = remaining - aiDescriptionTruncationNotice.length
      if (allowedLength > 0) {
        append(body.slice(0, allowedLength))
      }
      append(aiDescriptionTruncationNotice)
      return false
    }

    const appendSection = async (title: string, file: File, maxBodyLength?: number) => {
      if (remaining <= 0) {
        skippedSections.push(title)
        return
      }

      const header = `=== ${title} ===`
      const headerLength = header.length + 1
      if (remaining <= headerLength) {
        skippedSections.push(title)
        return
      }

      const body = await toText(file)
      let sectionBudget = remaining - headerLength
      if (maxBodyLength != null) sectionBudget = Math.min(sectionBudget, maxBodyLength)
      if (sectionBudget <= 0) {
        skippedSections.push(title)
        return
      }
      let bodyToAppend = body
      if (body.length > sectionBudget) {
        const sliceLength = sectionBudget - aiDescriptionTruncationNotice.length
        if (sliceLength <= 0) {
          skippedSections.push(title)
          return
        }
        bodyToAppend = body.slice(0, sliceLength) + aiDescriptionTruncationNotice
      }

      appendLine(header)
      append(bodyToAppend)
      if (remaining > 0) appendBlankLine()
    }

    const metadataLines: string[] = []
    if (this.name != null && this.name !== '') {
      metadataLines.push(`Game: ${this.name}`)
    }
    if (this.description != null && this.description !== '') {
      metadataLines.push(`Description: ${this.description}`)
    }
    if (this.instructions != null && this.instructions !== '') {
      metadataLines.push(`Instructions: ${this.instructions}`)
    }
    if (metadataLines.length > 0) {
      appendBody(`${metadataLines.join('\n')}\n`)
      if (remaining > 0) appendBlankLine()
    }

    const mainSpxFile = files['main.spx']
    if (mainSpxFile != null) {
      await appendSection('File: main.spx', mainSpxFile, mainFileMaxLength)
    }

    for (const sprite of this.sprites) {
      const spriteFile = files[`${sprite.name}.spx`]
      if (spriteFile != null) {
        await appendSection(`File: ${sprite.name}.spx`, spriteFile, spriteFileMaxLength)
      }
    }

    const projectConfig = files[projectConfigFilePath]
    if (projectConfig != null) {
      await appendSection('Project Config (assets/index.json)', projectConfig, projectConfigMaxLength)
    }

    for (const sprite of this.sprites) {
      const spriteConfigPath = join('assets', 'sprites', sprite.name, 'index.json')
      const spriteConfig = files[spriteConfigPath]
      if (spriteConfig != null) {
        await appendSection(`Sprite Config: ${spriteConfigPath}`, spriteConfig, spriteConfigMaxLength)
      }
    }

    if (skippedSections.length > 0 && remaining > 0) {
      const header = '=== Skipped Sections ==='
      if (remaining > header.length + 1) {
        appendLine(header)
        for (const name of skippedSections) {
          if (remaining <= 0) break
          appendLine(name)
        }
      }
    }

    return result
  }

  /**
   * Ensure image size metadata is populated for all image files.
   * NOTE: For debugging purpose only.
   */
  private async ensureImgSize(forceRecalculate = false) {
    const imgs: File[] = []
    this.sprites.forEach((sprite) => {
      imgs.push(...sprite.getAllCostumes().map((c) => c.img))
    })
    imgs.push(...this.stage.backdrops.map((b) => b.img))
    const startAt = performance.now()
    // eslint-disable-next-line no-console
    console.debug(`Calculating image size for ${imgs.length} images`)
    let skipped = 0
    await Promise.all(
      imgs.map((img) => {
        if (forceRecalculate) img.meta.imgSize = undefined
        if (img.meta.imgSize != null) {
          skipped++
          return
        }
        return getImageSize(img)
      })
    )
    // eslint-disable-next-line no-console
    console.debug(
      `Image size calculation completed in ${performance.now() - startAt} ms. ${imgs.length - skipped} processed, ${skipped} skipped`
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

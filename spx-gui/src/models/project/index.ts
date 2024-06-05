/**
 * @file class Project
 * @desc Object-model definition for Project
 */

import { reactive, watch } from 'vue'

import { join } from '@/utils/path'
import { debounce } from '@/utils/utils'
import { IsPublic, type ProjectData } from '@/apis/project'
import { Disposble } from '../common/disposable'
import { toConfig, type Files, fromConfig } from '../common/file'
import { Stage, type RawStageConfig } from '../stage'
import { Sprite } from '../sprite'
import { Sound } from '../sound'
import * as cloudHelper from '../common/cloud'
import * as localHelper from '../common/local'
import * as gbpHelper from '../common/gbp'
import { hashFiles } from '../common/hash'
import { assign } from '../common'
import { ensureValidSpriteName, ensureValidSoundName } from '../common/asset-name'
import { History } from './history'

export type { Action } from './history'

export type Metadata = {
  id?: string
  owner?: string
  name?: string
  isPublic?: IsPublic
  version?: number
  cTime?: string
  uTime?: string
  filesHash?: string
  lastSyncedFilesHash?: string
}

const projectConfigFileName = 'index.json'
const projectConfigFilePath = join('assets', projectConfigFileName)

export type Selected =
  | {
      type: 'sprite'
      name: string
    }
  | {
      type: 'sound'
      name: string
    }
  | {
      type: 'stage'
    }
  | null

type RawProjectConfig = RawStageConfig & {
  // TODO: support other types in zorder
  zorder?: string[]
  // TODO: camera
}

export class Project extends Disposble {
  id?: string
  owner?: string
  name?: string
  isPublic?: IsPublic
  version = 0
  cTime?: string
  uTime?: string

  private filesHash?: string
  private lastSyncedFilesHash?: string
  /** If there is any change of game content not synced (to cloud) yet. */
  get hasUnsyncedChanges() {
    return this.lastSyncedFilesHash !== this.filesHash
  }

  stage: Stage
  sprites: Sprite[]
  sounds: Sound[]
  zorder: string[]

  removeSprite(name: string) {
    const idx = this.sprites.findIndex((s) => s.name === name)
    const [sprite] = this.sprites.splice(idx, 1)
    sprite.dispose()
    this.autoSelect()
  }
  /**
   * Add given sprite to project.
   * Note: the sprite's name may be altered to avoid conflict
   */
  addSprite(sprite: Sprite) {
    const newName = ensureValidSpriteName(sprite.name, this)
    sprite.setName(newName)
    sprite.setProject(this)
    sprite.addDisposer(() => sprite.setProject(null))
    this.sprites.push(sprite)
    if (!this.zorder.includes(sprite.name)) {
      this.zorder = [...this.zorder, sprite.name]
    }
    sprite.addDisposer(
      // update zorder & selected when sprite renamed
      watch(
        () => sprite.name,
        (newName, originalName) => {
          this.zorder = this.zorder.map((v) => (v === originalName ? newName : v))
          if (this.selected?.type === 'sprite' && this.selected.name === originalName) {
            this.select({ type: 'sprite', name: newName })
          }
        }
      )
    )
    sprite.addDisposer(() => {
      this.zorder = this.zorder.filter((v) => v !== sprite.name)
    })
  }
  private setSpriteZorderIdx(
    name: string,
    newIdx: number | ((idx: number, length: number) => number)
  ) {
    const idx = this.zorder.findIndex((v) => v === name)
    if (idx < 0) throw new Error(`sprite ${name} not found in zorder`)
    const newIdxVal = typeof newIdx === 'function' ? newIdx(idx, this.zorder.length) : newIdx
    const newZorder = this.zorder.filter((v) => v !== name)
    newZorder.splice(newIdxVal, 0, name)
    this.zorder = newZorder
  }
  upSpriteZorder(name: string) {
    this.setSpriteZorderIdx(name, (i, len) => Math.min(i + 1, len - 1))
  }
  downSpriteZorder(name: string) {
    this.setSpriteZorderIdx(name, (i) => Math.max(i - 1, 0))
  }
  topSpriteZorder(name: string) {
    this.setSpriteZorderIdx(name, (_, len) => len - 1)
  }
  bottomSpriteZorder(name: string) {
    this.setSpriteZorderIdx(name, 0)
  }

  removeSound(name: string) {
    const idx = this.sounds.findIndex((s) => s.name === name)
    const [sound] = this.sounds.splice(idx, 1)
    sound.dispose()
    this.autoSelect()
  }
  /**
   * Add given sound to project.
   * Note: the sound's name may be altered to avoid conflict
   */
  addSound(sound: Sound) {
    const newName = ensureValidSoundName(sound.name, this)
    sound.setName(newName)
    sound.setProject(this)
    sound.addDisposer(() => sound.setProject(null))
    this.sounds.push(sound)
    sound.addDisposer(
      // update selected when sound renamed
      watch(
        () => sound.name,
        (newName, originalName) => {
          if (this.selected?.type === 'sound' && this.selected.name === originalName) {
            this.select({ type: 'sound', name: newName })
          }
        }
      )
    )
  }

  setPublic(isPublic: IsPublic) {
    this.isPublic = isPublic
  }

  selected: Selected = null

  get selectedSprite() {
    const { selected, sprites } = this
    if (selected?.type !== 'sprite') return null
    return sprites.find((s) => s.name === selected.name) ?? null
  }

  get selectedSound() {
    const { selected, sounds } = this
    if (selected?.type !== 'sound') return null
    return sounds.find((s) => s.name === selected.name) ?? null
  }

  select(selected: Selected) {
    this.selected = selected
  }

  /**
   * Check if current selected target is valid. If not, select some target automatically.
   * Targets with the same type are preferred.
   */
  autoSelect() {
    const selected = this.selected
    if (selected?.type === 'sprite' && this.selectedSprite == null) {
      this.select(this.sprites[0] != null ? { type: 'sprite', name: this.sprites[0].name } : null)
    } else if (selected?.type === 'sound' && this.selectedSound == null) {
      this.select(this.sounds[0] != null ? { type: 'sound', name: this.sounds[0].name } : null)
    } else if (selected == null) {
      this.select(this.sprites[0] != null ? { type: 'sprite', name: this.sprites[0].name } : null)
    }
  }

  history: History

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
    })
    return reactiveThis
  }

  private applyMetadata(metadata: Metadata) {
    assign<Project>(this, metadata)
  }

  async loadGameFiles(files: Files) {
    const configFile = files[projectConfigFilePath]
    const config: RawProjectConfig = {}
    if (configFile != null) {
      Object.assign(config, await toConfig(configFile))
    }
    const { zorder, ...stageConfig } = config
    const [stage, sounds, sprites] = await Promise.all([
      Stage.load(stageConfig, files),
      Sound.loadAll(files),
      Sprite.loadAll(files)
    ])
    this.stage = stage
    this.sprites.splice(0).forEach((s) => s.dispose())
    sprites.forEach((s) => this.addSprite(s))
    this.sounds.splice(0).forEach((s) => s.dispose())
    sounds.forEach((s) => this.addSound(s))
    this.zorder = zorder ?? []
    this.autoSelect()
  }

  exportGameFiles(): Files {
    const files: Files = {}
    const [stageConfig, stageFiles] = this.stage.export()
    const config: RawProjectConfig = { ...stageConfig, zorder: this.zorder }
    files[projectConfigFilePath] = fromConfig(projectConfigFileName, config)
    Object.assign(files, stageFiles)
    Object.assign(files, ...this.sprites.map((s) => s.export()))
    Object.assign(files, ...this.sounds.map((s) => s.export()))
    return files
  }

  /** Load with metadata & game files */
  async load(metadata: Metadata, files: Files) {
    this.applyMetadata(metadata)
    await this.loadGameFiles(files)
  }

  /** Export metadata & game files */
  export(): [Metadata, Files] {
    const metadata: Metadata = {
      id: this.id,
      owner: this.owner,
      name: this.name,
      isPublic: this.isPublic,
      version: this.version,
      cTime: this.cTime,
      uTime: this.uTime,
      filesHash: this.filesHash,
      lastSyncedFilesHash: this.lastSyncedFilesHash
    }
    const files = this.exportGameFiles()
    return [metadata, files]
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
    const [metadata, files] = this.export()
    return await gbpHelper.save(metadata, files)
  }

  /** Load from cloud */
  async loadFromCloud(owner: string, name: string): Promise<void>
  async loadFromCloud(projectData: ProjectData): Promise<void>
  async loadFromCloud(ownerOrProjectData: string | ProjectData, name?: string) {
    const { metadata, files } =
      typeof ownerOrProjectData === 'string'
        ? await cloudHelper.load(ownerOrProjectData, name!)
        : await cloudHelper.parseProjectData(ownerOrProjectData)
    await this.load(metadata, files)
  }

  /** Save to cloud */
  async saveToCloud() {
    const [metadata, files] = this.export()
    const saved = await cloudHelper.save(metadata, files)
    this.applyMetadata(saved.metadata)
    this.lastSyncedFilesHash = await hashFiles(files)
  }

  /** Load from local cache */
  async loadFromLocalCache(key: string) {
    const cached = await localHelper.load(key)
    if (cached == null) throw new Error('no project in local cache')
    const { metadata, files } = cached
    await this.load(metadata, files)
  }

  /** Initialize editing features (sync change to local cache, update hasUnsyncedChanges on update, ...) */
  async startEditing(localCacheKey: string) {
    if (this.lastSyncedFilesHash == null) {
      this.lastSyncedFilesHash = await hashFiles(this.exportGameFiles())
    }
    this.addDisposer(
      watch(
        () => this.exportGameFiles(),
        async (files, _, onCleanup) => {
          let cancelled = false
          onCleanup(() => (cancelled = true))
          const filesHash = await hashFiles(files)
          if (!cancelled) this.filesHash = filesHash
        },
        { immediate: true }
      )
    )
    // sync changes to local cache
    const saveExports = debounce(() => {
      const [metadata, files] = this.export()
      localHelper.save(localCacheKey, metadata, files)
    }, 1000)
    this.addDisposer(watch(() => this.export(), saveExports, { immediate: true }))
  }
}

/** Get full name for project, which stands for a globally unique identifier for the project */
export function fullName(owner: string, name: string) {
  return `${owner}/${name}`
}

import { cloneDeep, findLastIndex } from 'lodash'
import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import type { I18n } from '@/utils/i18n'
import type { Files } from '../../common/file'
import type { SpxProject } from '../project'
import { CostumeGen, type RawCostumeGenConfig } from '../gen/costume-gen'
import { AnimationGen, type RawAnimationGenConfig } from '../gen/animation-gen'
import type { SpriteContent } from './sprite-content'

type Gen = CostumeGen | AnimationGen
type SnapshotConfig = { basePath: string; instruction: string; isVersion?: boolean } & (
  | { type: 'costume'; config: RawCostumeGenConfig }
  | { type: 'animation'; config: RawAnimationGenConfig }
)
type Snapshot = { config: SnapshotConfig; files: Files }
type Steps<T> = { undo: T[]; redo: T[] }
export type RawSpriteContentHistory = Record<string, Steps<SnapshotConfig>>

function hasPreview({ config: snapshot }: Snapshot) {
  if (snapshot.isVersion != null) return snapshot.isVersion
  return (
    (snapshot.type === 'costume' ? snapshot.config.imagePath != null : snapshot.config.videoPath != null) ||
    snapshot.config.finishPhaseSerialized?.state.result != null
  )
}

function isVersion(gen: Gen) {
  const status = gen instanceof CostumeGen ? gen.generateState.status : gen.generateVideoState.status
  const media = gen instanceof CostumeGen ? gen.image : gen.video
  return status !== 'running' && status !== 'failed' && (media != null || gen.result != null)
}

/** Per-resource draft history. Applying a resource ends its edit session. */
export class SpriteContentHistory {
  private entries: Record<string, Steps<Snapshot>> = {}

  constructor(
    private i18n: I18n,
    private project: SpxProject,
    private content: SpriteContent,
    private basePath: () => string
  ) {
    return reactive(this) as this
  }

  private snapshot(gen: Gen): Snapshot {
    const basePath = `${this.basePath()}/history/${nanoid()}`
    if (gen instanceof CostumeGen) {
      const [config, files] = gen.export(basePath)
      return {
        config: {
          type: 'costume',
          isVersion: isVersion(gen),
          basePath,
          config: cloneDeep(config),
          instruction: this.content.getCostumeInstruction(gen.id)
        },
        files
      }
    }
    const [config, files] = gen.export(basePath)
    return {
      config: {
        type: 'animation',
        isVersion: isVersion(gen),
        basePath,
        config: cloneDeep(config),
        instruction: gen.settings.description
      },
      files
    }
  }

  record(gen: Gen) {
    const status = gen instanceof CostumeGen ? gen.generateState.status : gen.generateVideoState.status
    if (status === 'running' || (status === 'failed' && this.entries[gen.id] != null)) return
    const entry = (this.entries[gen.id] ??= { undo: [], redo: [] })
    entry.undo.push(this.snapshot(gen))
    entry.redo = []
  }

  canUndo(id: string) {
    return this.entries[id]?.undo.some(hasPreview) ?? false
  }
  canRedo(id: string) {
    return this.entries[id]?.redo.some(hasPreview) ?? false
  }
  getVersion(id: string) {
    const undo = this.entries[id]?.undo
    if (undo == null || undo.length === 0) return 0
    const gen = this.content.getCostumeById(id) ?? this.content.getAnimationById(id)
    if (gen == null) return 0
    const current = isVersion(gen) ? 1 : 0
    return Math.max(0, undo.filter(hasPreview).length + current - (hasPreview(undo[0]) ? 1 : 0))
  }
  hasChanges(id: string) {
    return (this.entries[id]?.undo.length ?? 0) > 0 || (this.entries[id]?.redo.length ?? 0) > 0
  }
  clear(id: string) {
    delete this.entries[id]
  }

  private loadSnapshot({ config: snapshot, files }: Snapshot) {
    const { basePath } = snapshot
    return snapshot.type === 'costume'
      ? CostumeGen.load(this.i18n, this.content, this.project, snapshot.config, files, basePath, false)
      : AnimationGen.load(this.i18n, this.content, this.project, snapshot.config, files, basePath, false)
  }

  undo(gen: Gen) {
    this.move(gen, 'undo', 'redo')
  }
  redo(gen: Gen) {
    this.move(gen, 'redo', 'undo')
  }
  discard(gen: Gen) {
    const snapshot = this.entries[gen.id]?.undo[0]
    if (snapshot != null) this.restore(gen, this.loadSnapshot(snapshot), snapshot.config.instruction)
    this.clear(gen.id)
  }
  private move(gen: Gen, from: 'undo' | 'redo', to: 'undo' | 'redo') {
    const entry = this.entries[gen.id]
    if (entry == null) return
    const index = findLastIndex(entry[from], hasPreview)
    if (index < 0) return
    const snapshot = entry[from][index]
    const current = this.snapshot(gen)
    const restored = this.loadSnapshot(snapshot)
    if (!this.restore(gen, restored, snapshot.config.instruction)) return
    if (hasPreview(current)) entry[to].push(current)
    entry[from].splice(index)
  }

  private restore(gen: Gen, restored: Gen, instruction: string) {
    if (restored instanceof CostumeGen) {
      const index = this.content.costumes.findIndex((item) => item.id === gen.id)
      if (index < 0) {
        restored.dispose()
        return false
      }
      this.content.costumes.splice(index, 1, restored)
      this.content.setCostumeInstruction(gen.id, instruction)
    } else {
      const index = this.content.animations.findIndex((item) => item.id === gen.id)
      if (index < 0) {
        restored.dispose()
        return false
      }
      this.content.animations.splice(index, 1, restored)
      restored.setSettings({ description: instruction })
    }
    gen.dispose()
    return true
  }

  // Whole-sprite generation must not silently adopt unapplied resource edits.
  appliedResult(gen: CostumeGen): CostumeGen['result']
  appliedResult(gen: AnimationGen): AnimationGen['result']
  appliedResult(gen: Gen) {
    const snapshot = this.entries[gen.id]?.undo[0]
    if (snapshot == null) return gen.result
    const restored = this.loadSnapshot(snapshot)
    const result = restored.result
    restored.dispose()
    return result
  }

  export(): [RawSpriteContentHistory, Files] {
    const files: Files = {}
    const config: RawSpriteContentHistory = {}
    const serialize = (snapshot: Snapshot) => {
      Object.assign(files, snapshot.files)
      return snapshot.config
    }
    for (const [id, entry] of Object.entries(this.entries)) {
      config[id] = { undo: entry.undo.map(serialize), redo: entry.redo.map(serialize) }
    }
    return [config, files]
  }

  load(config: RawSpriteContentHistory, files: Files) {
    const restore = (snapshot: SnapshotConfig): Snapshot => ({
      config: snapshot,
      files: Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith(`${snapshot.basePath}/`)))
    })
    this.entries = Object.fromEntries(
      Object.entries(config).map(([id, entry]) => [
        id,
        { undo: entry.undo.map(restore), redo: entry.redo.map(restore) }
      ])
    )
  }
}

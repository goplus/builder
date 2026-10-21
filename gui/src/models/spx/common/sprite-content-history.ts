import { cloneDeep } from 'lodash'
import { nanoid } from 'nanoid'
import { reactive } from 'vue'
import type { I18n } from '@/utils/i18n'
import type { Files } from '../../common/file'
import type { SpxProject } from '../project'
import { CostumeGen, type RawCostumeGenConfig } from '../gen/costume-gen'
import { AnimationGen, type RawAnimationGenConfig } from '../gen/animation-gen'
import type { SpriteContent } from './sprite-content'

type Gen = CostumeGen | AnimationGen
type SnapshotConfig = { basePath: string; instruction: string } & (
  | { type: 'costume'; config: RawCostumeGenConfig }
  | { type: 'animation'; config: RawAnimationGenConfig }
)
type Snapshot = { config: SnapshotConfig; files: Files }
type Steps<T> = { undo: T[]; redo: T[] }
export type RawSpriteContentHistory = Record<string, Steps<SnapshotConfig>>

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
        basePath,
        config: cloneDeep(config),
        instruction: this.content.getAnimationInstruction(gen.id)
      },
      files
    }
  }

  record(gen: Gen) {
    const entry = (this.entries[gen.id] ??= { undo: [], redo: [] })
    entry.undo.push(this.snapshot(gen))
    entry.redo = []
  }

  canUndo(id: string) {
    return (this.entries[id]?.undo.length ?? 0) > 0
  }
  canRedo(id: string) {
    return (this.entries[id]?.redo.length ?? 0) > 0
  }
  hasChanges(id: string) {
    return this.canUndo(id)
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
    const snapshot = entry?.[from].at(-1)
    if (snapshot == null) return
    const restored = this.loadSnapshot(snapshot)
    entry[to].push(this.snapshot(gen))
    entry[from].pop()
    this.restore(gen, restored, snapshot.config.instruction)
  }

  private restore(gen: Gen, restored: Gen, instruction: string) {
    if (restored instanceof CostumeGen) {
      const index = this.content.costumes.findIndex((item) => item.id === gen.id)
      this.content.costumes.splice(index, 1, restored)
      this.content.setCostumeInstruction(gen.id, instruction)
    } else {
      const index = this.content.animations.findIndex((item) => item.id === gen.id)
      this.content.animations.splice(index, 1, restored)
      this.content.setAnimationInstruction(gen.id, instruction)
    }
    gen.dispose()
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

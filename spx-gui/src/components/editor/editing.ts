import { watchEffect, type WatchSource, watch, ref, shallowRef } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { timeout, until } from '@/utils/utils'
import { Cancelled, capture } from '@/utils/exception'
import { LocalHelper } from '@/models/common/local'
import type { IProject } from '@/models/project'
import type { CloudHelper } from '@/models/common/cloud'
import { History } from './history'

export interface ILocalCacheHelper {
  save(project: IProject, signal?: AbortSignal): Promise<void>
  clear(): Promise<void>
}

export enum SavingState {
  Pending,
  InProgress,
  Completed,
  Failed
}

export class Saving {
  private stateRef = ref(SavingState.Pending)
  get state() {
    return this.stateRef.value
  }

  constructor(
    private project: IProject,
    private cloudHelper: CloudHelper,
    private localCacheHelper: ILocalCacheHelper,
    private isOnline: WatchSource<boolean>,
    private signal: AbortSignal
  ) {
    this.start()
  }

  private async start() {
    timeout(1000, this.signal)
      .then(() => this.localCacheHelper.save(this.project, this.signal))
      .catch((e) => capture(e, 'Failed to save to local cache'))
    try {
      await timeout(1500, this.signal)
      await until(this.isOnline, this.signal) // Wait until online
      this.saveToCloud()
    } catch (e) {
      if (e instanceof Cancelled) return
      throw e
    }
  }

  private async saveToCloud(): Promise<void> {
    const signal = this.signal
    try {
      this.stateRef.value = SavingState.InProgress
      await this.cloudHelper.save(this.project, signal)
      signal.throwIfAborted()
      this.stateRef.value = SavingState.Completed
      this.localCacheHelper.clear().catch((e) => capture(e, 'Failed to clear local cache'))
    } catch (err) {
      if (err instanceof Cancelled) return
      capture(err, 'Failed to save project to cloud')
      this.stateRef.value = SavingState.Failed
      await timeout(5000, signal)
      return this.saveToCloud()
    }
  }

  flush() {
    // TODO: if `saveToCloud` already in progress, wait for it
    return this.saveToCloud()
  }
}

export enum EditingMode {
  /**
   * Updates will be saved to cloud automatically.
   * The default mode.
   */
  AutoSave,
  /**
   * Updates will not be saved to cloud.
   * Typically when editing a project that is not owned by the user.
   */
  EffectFree
}

export class LocalCacheHelper implements ILocalCacheHelper {
  constructor(
    private localHelper: LocalHelper,
    private cacheKey: string
  ) {}
  async save(project: IProject, signal?: AbortSignal) {
    await this.localHelper.save(project, this.cacheKey, signal)
  }
  async clear() {
    await this.localHelper.clear(this.cacheKey)
  }
}

// TODO: Move `History` into `Editing` (or `EditorState`).

export class Editing extends Disposable {
  history: History

  constructor(
    public mode: EditingMode,
    private project: IProject,
    private cloudHelper: CloudHelper,
    private localCacheHelper: ILocalCacheHelper,
    private isOnline: WatchSource<boolean>
    // private signedInUsername: WatchSource<string | null>
  ) {
    super()
    this.history = new History(project)
  }

  // get mode(): EditingMode {
  //   const username = toValue(this.signedInUsername)
  //   if (username == null || username !== this.project.owner) {
  //     return EditingMode.EffectFree
  //   }
  //   return EditingMode.AutoSave
  // }

  private startAutoPreload() {
    this.addDisposer(
      watchEffect((onCleanup) => {
        const signal = getCleanupSignal(onCleanup)
        const files = this.project.exportFiles()
        Object.values(files).forEach((file) => {
          if (file == null) return
          file.arrayBuffer(signal).catch((e) => {
            capture(e, 'Failed to preload file ' + file.name)
          })
        })
      })
    )
  }

  private dirtyRef = shallowRef(false)

  get dirty() {
    return this.dirtyRef.value
  }

  private startDirtyMonitoring() {
    this.addDisposer(
      watch(
        () => this.project.exportFiles(),
        () => (this.dirtyRef.value = true)
      )
    )
    this.addDisposer(
      watch(
        () => this.saving?.state,
        (state) => {
          if (state === SavingState.Completed) {
            this.dirtyRef.value = false
          }
        }
      )
    )
  }

  private savingRef = shallowRef<Saving | null>(null)

  get saving() {
    return this.savingRef.value
  }

  private startAutoSave() {
    this.addDisposer(
      watch(
        () => this.project.exportFiles(),
        (_, __, onCleanup) => {
          if (this.mode === EditingMode.EffectFree) return

          const signal = getCleanupSignal(onCleanup)
          const saving = new Saving(this.project, this.cloudHelper, this.localCacheHelper, this.isOnline, signal)

          this.savingRef.value = saving
          signal.addEventListener('abort', () => (this.savingRef.value = null))
        }
      )
    )
  }

  start() {
    this.startDirtyMonitoring()
    this.startAutoPreload()
    this.startAutoSave()
  }
}

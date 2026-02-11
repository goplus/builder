import { watchEffect, type WatchSource, watch, ref, shallowRef } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { timeout, until } from '@/utils/utils'
import { Cancelled, capture } from '@/utils/exception'
import type { IProject } from '@/models/project'
import type { CloudHelpers } from '@/models/common/cloud'
import { History } from './history'

export enum SavingState {
  Pending,
  InProgress,
  Completed,
  Failed
}

export interface ILocalCache {
  load(project: IProject): Promise<boolean>
  save(project: IProject, signal?: AbortSignal): Promise<void>
  clear(): Promise<void>
}

export class Saving {
  private stateRef = ref(SavingState.Pending)
  get state() {
    return this.stateRef.value
  }

  constructor(
    private project: IProject,
    private cloudHelper: CloudHelpers,
    private localCacheHelper: ILocalCache,
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

// TODO: Move `History` into `Editing` (or `EditorState`).

export class Editing extends Disposable {
  history: History

  constructor(
    public mode: EditingMode,
    private project: IProject,
    private cloudHelper: CloudHelpers,
    private localCacheHelper: ILocalCache,
    private isOnline: WatchSource<boolean>
  ) {
    super()
    this.history = new History(project)
  }

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

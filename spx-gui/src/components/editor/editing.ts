import { watchEffect, type WatchSource, watch, toValue, ref, shallowRef } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { timeout, until } from '@/utils/utils'
import { Cancelled, capture } from '@/utils/exception'
import type { Files } from '@/models/common/file'
import * as localHelper from '@/models/common/local'

export interface EditableProject {
  owner?: string
  exportGameFiles(): Files
  saveToCloud(signal?: AbortSignal): Promise<void>
  saveToLocalCache(key: string, signal?: AbortSignal): Promise<void>
}

export interface LocalStorage {
  clear(key: string): Promise<void>
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
    private project: EditableProject,
    private localStorage: LocalStorage,
    private isOnline: WatchSource<boolean>,
    private localCacheKey: string,
    private signal: AbortSignal
  ) {
    this.start()
  }

  private async start() {
    timeout(1000, this.signal)
      .then(() => this.project.saveToLocalCache(this.localCacheKey, this.signal))
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

  private async saveToCloud() {
    const signal = this.signal
    try {
      this.stateRef.value = SavingState.InProgress
      await this.project.saveToCloud(signal)
      signal.throwIfAborted()
      this.stateRef.value = SavingState.Completed
      this.localStorage.clear(this.localCacheKey)
    } catch (err) {
      if (err instanceof Cancelled) return
      capture(err, 'Failed to save project to cloud')
      this.stateRef.value = SavingState.Failed
      await timeout(5000, signal)
      this.saveToCloud()
    }
  }

  flush() {
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
  constructor(
    private project: EditableProject,
    private isOnline: WatchSource<boolean>,
    private signedInUsername: WatchSource<string | null>,
    private localCacheKey: string,
    private localStorage: LocalStorage = localHelper
  ) {
    super()
  }

  get mode(): EditingMode {
    const username = toValue(this.signedInUsername)
    if (username == null || username !== this.project.owner) {
      return EditingMode.EffectFree
    }
    return EditingMode.AutoSave
  }

  private startAutoPreload() {
    this.addDisposer(
      watchEffect((onCleanup) => {
        const signal = getCleanupSignal(onCleanup)
        const files = this.project.exportGameFiles()
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
        () => this.project.exportGameFiles(),
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
        () => this.project.exportGameFiles(),
        (_, __, onCleanup) => {
          if (this.mode === EditingMode.EffectFree) return

          const signal = getCleanupSignal(onCleanup)
          const saving = new Saving(this.project, this.localStorage, this.isOnline, this.localCacheKey, signal)

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

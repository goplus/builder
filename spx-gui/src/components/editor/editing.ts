import { watchEffect, type WatchSource, watch, toValue, ref, shallowRef } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { timeout, until } from '@/utils/utils'
import { Cancelled, capture } from '@/utils/exception'
import type { Files } from '@/models/common/file'
import * as localHelper from '@/models/common/local'
import type { UserInfo } from '@/stores/user'

export interface EditableProject {
  owner?: string
  exportGameFiles(): Files
  saveToCloud(signal?: AbortSignal): Promise<void>
  saveToLocalCache(key: string, signal?: AbortSignal): Promise<void>
}

export interface LocalStorage {
  clear(key: string): Promise<void>
}

enum SavingState {
  Pending,
  InProgress,
  Completed,
  Failed
}

class Saving {
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
  ) {}

  async start() {
    timeout(1000, this.signal)
      .then(() => this.project.saveToLocalCache(this.localCacheKey, this.signal))
      .catch((e) => {
        if (e instanceof Cancelled) return
        console.warn('Failed to save to local cache:', e)
      })
    try {
      await timeout(1500, this.signal)
      await until(this.isOnline, this.signal) // Wait until online
      this.saveToCloud()
    } catch (e) {
      if (e instanceof Cancelled) return
      throw e
    }
  }

  async saveToCloud() {
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

export enum AutoSaveState {
  /** Saved to cloud */
  Saved,
  /** There's save operation pending */
  Pending,
  /** There's save operation in progress */
  Saving,
  /** Save operation failed */
  Failed
}

export class Editing extends Disposable {
  constructor(
    private project: EditableProject,
    private isOnline: WatchSource<boolean>,
    private userInfo: WatchSource<UserInfo | null>,
    private localCacheKey: string,
    private localStorage: LocalStorage = localHelper
  ) {
    super()
  }

  get mode(): EditingMode {
    const userInfo = toValue(this.userInfo)
    if (userInfo == null || userInfo.name !== this.project.owner) {
      return EditingMode.EffectFree
    }
    return EditingMode.AutoSave
  }

  private startAutoPreload() {
    this.addDisposer(
      watchEffect(() => {
        const files = this.project.exportGameFiles()
        Object.values(files).forEach((file) => file?.arrayBuffer())
      })
    )
  }

  get autoSaveState(): AutoSaveState {
    const saving = this.savingRef.value
    if (saving == null) return AutoSaveState.Saved
    switch (saving.state) {
      case SavingState.Pending:
        return AutoSaveState.Pending
      case SavingState.InProgress:
        return AutoSaveState.Saving
      case SavingState.Completed:
        return AutoSaveState.Saved
      case SavingState.Failed:
        return AutoSaveState.Failed
    }
  }

  private savingRef = shallowRef<Saving | null>(null)

  async flushSaving() {
    await this.savingRef.value?.saveToCloud()
  }

  private startAutoSave() {
    this.addDisposer(
      watch(
        () => this.project.exportGameFiles(),
        (_, __, onCleanup) => {
          if (this.mode === EditingMode.EffectFree) return

          const signal = getCleanupSignal(onCleanup)
          const saving = new Saving(this.project, this.localStorage, this.isOnline, this.localCacheKey, signal)
          saving.start()

          this.savingRef.value = saving
          signal.addEventListener('abort', () => (this.savingRef.value = null))
        }
      )
    )
  }

  start() {
    this.startAutoPreload()
    this.startAutoSave()
  }
}

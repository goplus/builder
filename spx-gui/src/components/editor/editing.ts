import { watchEffect, type WatchSource, watch, ref, shallowRef } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { ProgressCollector, type ProgressReporter } from '@/utils/progress'
import { timeout, until } from '@/utils/utils'
import { Cancelled, capture } from '@/utils/exception'
import type { IProject, ProjectSerialized } from '@/models/project'
import type { CloudHelpers } from '@/models/common/cloud'
import { History } from './history'

export enum SavingState {
  Pending,
  InProgress,
  Completed,
  Failed
}

export interface ILocalCache {
  load(signal?: AbortSignal): Promise<ProjectSerialized | null>
  save(serialized: ProjectSerialized, signal?: AbortSignal): Promise<void>
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
      .then(async () => {
        const serialized = await this.project.export(this.signal)
        return this.localCacheHelper.save(serialized, this.signal)
      })
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
      const serialized = await this.project.export(signal)
      const saved = await this.cloudHelper.save(serialized, signal)
      this.project.setMetadata(saved.metadata)
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

export type UIHelpersForLoadingProject = {
  confirmOpenTargetWithAnotherInCache: (targetName: string, cachedName: string) => Promise<boolean>
  openProject: (owner: string, name: string) => void
}

export class Editing extends Disposable {
  mode: EditingMode
  history: History
  constructor(
    private project: IProject,
    private cloudHelpers: CloudHelpers,
    private localCacheHelper: ILocalCache,
    private isOnline: WatchSource<boolean>,
    private signedInUsername: string | null
  ) {
    super()
    this.mode = EditingMode.AutoSave
    if (signedInUsername == null || signedInUsername !== this.project.owner) {
      this.mode = EditingMode.EffectFree
    }
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
          const saving = new Saving(this.project, this.cloudHelpers, this.localCacheHelper, this.isOnline, signal)

          this.savingRef.value = saving
          signal.addEventListener('abort', () => (this.savingRef.value = null))
        }
      )
    )
  }

  async loadProject(helpers: UIHelpersForLoadingProject, reporter: ProgressReporter, signal: AbortSignal) {
    const collector = ProgressCollector.collectorFor(reporter)
    const loadFromLocalCacheReporter = collector.getSubReporter(
      { en: 'Reading local cache...', zh: '读取本地缓存中...' },
      1
    )
    const loadFromCloudReporter = collector.getSubReporter(
      { en: 'Loading project from cloud...', zh: '从云端加载项目中...' },
      5
    )
    const projectLoadReporter = collector.getSubReporter({ en: 'Loading project...', zh: '加载项目中...' }, 5)

    const { owner: ownerName, name: projectName } = this.project
    if (ownerName == null || projectName == null) throw new Error('Project owner and name expected')

    // For details about local-cache saving & restoring
    // https://github.com/goplus/builder/issues/259
    // https://github.com/goplus/builder/issues/393
    let localData: ProjectSerialized | null = null
    try {
      localData = await this.localCacheHelper.load(signal)
    } catch (e) {
      if (e instanceof Cancelled) throw e
      capture(e, 'Failed to load local cache')
      this.localCacheHelper.clear().catch((e) => capture(e, 'Failed to clear local cache'))
    }
    if (localData != null) {
      const localMetadata = localData.metadata
      // If owner mismatch, ignore & clear the cached data
      if (localMetadata.owner !== ownerName) {
        localData = null
        this.localCacheHelper.clear().catch((e) => capture(e, 'Failed to clear local cache'))
      }
      if (localMetadata.owner === ownerName && localMetadata.name != null && localMetadata.name !== projectName) {
        // If project name mismatch, ask user whether to open the cached project or not, to avoid potential data loss by clearing cache
        const stillOpenTarget = await helpers.confirmOpenTargetWithAnotherInCache(projectName, localMetadata.name)
        signal.throwIfAborted()
        if (stillOpenTarget) {
          localData = null
          this.localCacheHelper.clear().catch((e) => capture(e, 'Failed to clear local cache'))
        } else {
          helpers.openProject(localMetadata.owner, localMetadata.name)
          throw new Cancelled('Open another project')
        }
      }
    }
    signal.throwIfAborted()
    loadFromLocalCacheReporter.report(1)

    // For projects not owned by the signed-in user, we prefer to load the published version.
    const preferPublishedContent = this.signedInUsername !== ownerName
    const cloudData = await this.cloudHelpers.load(ownerName, projectName, preferPublishedContent, signal)
    signal.throwIfAborted()
    loadFromCloudReporter.report(1)

    let finalData = cloudData
    if (localData != null) {
      const cloudVersion = cloudData?.metadata.version ?? -1
      const localVersion = localData.metadata.version ?? -1
      if (cloudVersion > localVersion) {
        // If cloud version is newer, ignore & clear the cached data to avoid potential conflict
        this.localCacheHelper.clear().catch((e) => capture(e, 'Failed to clear local cache'))
      } else {
        finalData = localData
      }
    }
    await this.project.load(finalData, signal)
    signal.throwIfAborted()
    projectLoadReporter.report(1)
  }

  startEditing() {
    this.startDirtyMonitoring()
    this.startAutoPreload()
    this.startAutoSave()
  }
}

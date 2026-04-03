import { watchEffect, type WatchSource, watch, ref, shallowRef } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { ProgressCollector, type ProgressReporter } from '@/utils/progress'
import { timeout, until } from '@/utils/utils'
import { untilLoaded, type QueryRet } from '@/utils/query'
import { Cancelled, capture } from '@/utils/exception'
import type { ProjectData } from '@/apis/project'
import type { IProject, ProjectSerialized } from '@/models/project'
import type { CloudHelpers } from '@/models/common/cloud'
import type { SignedInState } from '@/stores/user'

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

/**
 * `Editing` manages the lifecycle of editing a project, including:
 * - Determining the editing mode (AutoSave vs EffectFree) based on user ownership
 * - Loading the project from cloud/local cache on initialization
 * - Monitoring dirty state and triggering auto-saves
 * - Pre-loading project files for performance
 *
 * Note: `Editing` operates on the full project (including gen state via `SpxProjectWithGens`).
 * `History` (undo/redo) is intentionally kept separate in `EditorState` and operates only on
 * the base `SpxProject` files, so that gen-state changes do not affect the undo/redo stack.
 *
 * TODO: Since history in not included in `Editing` now, which is counterintuitive, consider
 * renaming it with a more accurate name.
 */
export class Editing extends Disposable {
  constructor(
    private project: IProject,
    private cloudHelpers: CloudHelpers,
    private localCacheHelper: ILocalCache,
    private isOnline: WatchSource<boolean>,
    private signedInStateQuery: QueryRet<SignedInState>
  ) {
    super()
  }

  get mode() {
    const signedInState = this.signedInStateQuery.data.value
    if (signedInState == null || !signedInState.isSignedIn) return EditingMode.EffectFree
    if (this.project.owner == null || signedInState.user.username !== this.project.owner) return EditingMode.EffectFree
    return EditingMode.AutoSave
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
      watch([() => this.project.exportFiles(), () => this.mode], ([, mode], __, onCleanup) => {
        if (mode === EditingMode.EffectFree || !this.dirty) return

        const signal = getCleanupSignal(onCleanup)
        const saving = new Saving(this.project, this.cloudHelpers, this.localCacheHelper, this.isOnline, signal)

        this.savingRef.value = saving
        signal.addEventListener('abort', () => (this.savingRef.value = null))
      })
    )
  }

  async loadProject(
    ownerInput: string,
    projectNameInput: string,
    helpers: UIHelpersForLoadingProject,
    reporter: ProgressReporter,
    signal: AbortSignal
  ) {
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

    const preferPublished = async (projectData: ProjectData) => {
      const signedInState = await untilLoaded(this.signedInStateQuery, signal)
      const ownedBySignedInUser = signedInState.isSignedIn && signedInState.user.username === projectData.owner
      return !ownedBySignedInUser
    }
    const cloudData = await this.cloudHelpers.load(ownerInput, projectNameInput, preferPublished, signal)
    signal.throwIfAborted()
    loadFromCloudReporter.report(1)

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
      const { owner: localOwner, name: localName } = localData.metadata
      const { owner: cloudOwner, name: cloudName } = cloudData.metadata
      // If no owner/name info or owner mismatch, ignore & clear the cached data
      if (localOwner == null || localName == null || localOwner !== cloudOwner) {
        localData = null
        this.localCacheHelper.clear().catch((e) => capture(e, 'Failed to clear local cache'))
      } else if (localName !== cloudName) {
        // If project name mismatch, ask user whether to open the cached project or not, to avoid potential data loss by clearing cache
        const stillOpenTarget = await helpers.confirmOpenTargetWithAnotherInCache(cloudName, localName)
        signal.throwIfAborted()
        if (stillOpenTarget) {
          localData = null
          this.localCacheHelper.clear().catch((e) => capture(e, 'Failed to clear local cache'))
        } else {
          helpers.openProject(localOwner, localName)
          throw new Cancelled('Open another project')
        }
      }
    }
    signal.throwIfAborted()
    loadFromLocalCacheReporter.report(1)

    let finalData: ProjectSerialized = cloudData
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

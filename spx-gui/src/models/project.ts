import type { Prettify } from '@/utils/types'
import type Mutex from '@/utils/mutex'
import type { ProjectData } from '@/apis/project'
import type { File, Files } from './common/file'

export type CloudMetadata = Prettify<
  Omit<ProjectData, 'latestRelease' | 'files' | 'thumbnail'> & {
    thumbnail: File | null
  }
>

export type Metadata = Partial<CloudMetadata> & {
  // The ai-description related fields are specific for spx projects.
  // We retain them in the project metadata for easier access and management,
  // and they will be saved to the cloud or xbp as separate files.
  // TODO: Consider relocating them from project metadata (to project files?) if they are not applicable to other project types.
  // Refer to https://github.com/goplus/builder/pull/1932#discussion_r2266234375 before implementing this change.
  aiDescription?: string | null
  aiDescriptionHash?: string | null
}

export interface IProject {
  /**
   * Mutex for transaction operations on the project.
   * Use this to ensure transactional operations atomicity.
   *
   * For example, when a project is processing time-cost changes (e.g., loading from a xbp file),
   * we want to ensure that the project is not saved in the middle of loading, which may cause incomplete
   * or corrupted content to be saved. By acquiring the mutex during loading, we can prevent saving until loading is complete.
   */
  mutex: Mutex

  /** Username of the project owner. */
  owner?: string

  /** Name of the project. */
  name?: string

  /** Set metadata fields of the project. */
  setMetadata(metadata: Metadata): void

  /** Load project content from files. */
  loadFiles(files: Files, signal?: AbortSignal): Promise<void>

  /**
   * Export project content to files.
   *
   * The result is expected to be memoized, and will only be re-computed when the project content changed.
   * By watching result of this method, the caller can get notified when project content changed.
   *
   * NOTE: this method may return intermediate result during transactional edits.
   *
   * TODO: we may need to migrate most callers of this method to use some alternative methods that ensure atomicity.
   */
  exportFiles(): Files

  /**
   * Load project from metadata and files.
   *
   * Typically done in two steps: 1) set metadata via `setMetadata`, 2) load game content via `loadFiles`.
   * Implementations may combine them to ensure transactional loading, control ordering, or perform
   * additional work before, during, or after loading.
   */
  load(metadata: Metadata, files: Files, signal?: AbortSignal): Promise<void>

  /**
   * Export project to metadata and files for saving.
   *
   * Typically done in two steps: 1) collect metadata, 2) export game content via `exportFiles`.
   * Implementations may combine them to ensure transactional exporting, control ordering, or perform
   * additional work before, during, or after exporting.
   */
  export(signal?: AbortSignal): Promise<[Metadata, Files]>
}

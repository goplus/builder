import type { Prettify } from '@/utils/types'
import type { ProjectData } from '@/apis/project'
import type { File, Files } from './common/file'
import type Mutex from '@/utils/mutex'

export type CloudMetadata = Prettify<
  Omit<ProjectData, 'latestRelease' | 'files' | 'thumbnail'> & {
    thumbnail: File | null
  }
>

export type Metadata = Prettify<
  Partial<CloudMetadata> & {
    aiDescription?: string | null
    aiDescriptionHash?: string | null
  }
>

export interface IProject {
  /**
   * Mutex for transaction operations on the project.
   * Use this to ensure transactional operations atomicity.
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
  /** Export project content to files. */
  exportFiles(): Files
  /**
   * Load project content from metadata and files.
   * Typically done in two steps: 1) set metadata via `setMetadata`, 2) load game content via `loadFiles`.
   * Implementations may combine them to ensure transactional loading, control ordering, or perform
   * additional work before, during, or after loading.
   */
  load(metadata: Metadata, files: Files, signal?: AbortSignal): Promise<void>
  /**
   * Export project content to metadata and files for saving
   * Typically done in two steps: 1) collect metadata, 2) export game content via `exportFiles`.
   * Implementations may combine them to ensure transactional exporting, control ordering, or perform
   * additional work before, during, or after exporting.
   */
  export(signal?: AbortSignal): Promise<[Metadata, Files]>
}

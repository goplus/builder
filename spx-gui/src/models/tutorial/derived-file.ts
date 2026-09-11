import { markRaw } from 'vue'
import type { File } from '@/models/common/file'

/**
 * A file generated from model state (a config, a code string). The same `File` instance is returned as long as
 * the source text is unchanged, so exports of unchanged state keep their identity and can be compared cheaply.
 *
 * Why it exists: the Course Editor decides whether a record is "unsaved" by comparing the `File` instances of two
 * exports (see `components/course-editor/course-tree.ts#getChangedPaths`). Without this memo every export would
 * create fresh `File` objects for generated records, and every generated record would look changed all the time.
 *
 * Invariants:
 * - `file` is non-null exactly when `source` is non-null; both are set together in `get()`.
 * - `file` was produced by `create(source)` for the currently stored `source`, never for an older one.
 * - The instance is never reactive (`markRaw`), so reading/writing the memo inside a Vue effect neither registers
 *   dependencies nor triggers re-runs.
 *
 * Consumed by: models/tutorial/course.ts#Course.codeFile, models/tutorial/project.ts#TutorialProject.configFile
 * and models/tutorial/resource.ts#Resource.configFile (all private fields of the owning models).
 */
export class DerivedFile {
  /** The source text the memoized `file` was generated from; null until the first `get()`. */
  private source: string | null = null
  /** The memoized generated file; null until the first `get()`. */
  private file: File | null = null

  /**
   * Creates a memo around a file factory.
   * @param create - Factory turning the source text into a `File` (for example `fromText(path, source)`).
   * @returns The new `DerivedFile`, marked raw so Vue never proxies it.
   * Called by: models/tutorial/course.ts#Course (field initializer `codeFile`),
   * models/tutorial/project.ts#TutorialProject (field initializer `configFile`),
   * models/tutorial/resource.ts#Resource (field initializer `configFile`).
   */
  constructor(private create: (source: string) => File) {
    // Never made reactive by owning models: reading and writing the memo inside `exportFiles()` must not
    // register dependencies or trigger effects.
    markRaw(this)
  }

  /**
   * Returns the file for `source`, reusing the previous `File` instance when `source` is unchanged.
   * @param source - The current source text (config JSON, program code, ...).
   * @returns The `File` generated from `source`; the same instance as the last call if `source` did not change.
   * Called by: models/tutorial/course.ts#Course.export, models/tutorial/project.ts#TutorialProject.exportConfig,
   * models/tutorial/resource.ts#Resource.export.
   */
  get(source: string): File {
    // Regenerate only on the first call or when the source text differs from the memoized one.
    if (this.file == null || this.source !== source) {
      this.source = source
      this.file = this.create(source)
    }
    return this.file
  }
}

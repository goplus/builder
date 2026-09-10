import { markRaw } from 'vue'
import type { File } from '@/models/common/file'

/**
 * A file generated from model state (a config, a code string). The same `File` instance is returned as long as
 * the source text is unchanged, so exports of unchanged state keep their identity and can be compared cheaply.
 */
export class DerivedFile {
  private source: string | null = null
  private file: File | null = null

  constructor(private create: (source: string) => File) {
    // Never made reactive by owning models: reading and writing the memo inside `exportFiles()` must not
    // register dependencies or trigger effects.
    markRaw(this)
  }

  get(source: string): File {
    if (this.file == null || this.source !== source) {
      this.source = source
      this.file = this.create(source)
    }
    return this.file
  }
}

import { vi } from 'vitest'
import { shallowRef } from 'vue'
import Mutex from '@/utils/mutex'
import type { IProject, PartialMetadata, ProjectSerialized } from '@/models/project'
import { File, fromText, type Files } from '../common/file'
import { createFileWithUniversalUrl } from './cloud'

export function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

export class MockProject implements IProject {
  mutex = new Mutex()

  private filesRef = shallowRef<Files>({})
  setFile(path: string, file: File): void {
    this.filesRef.value = { ...this.filesRef.value, [path]: file }
  }

  constructor(
    public owner?: string,
    public name?: string,
    files: Files = {}
  ) {
    this.filesRef.value = files
  }
  private getMetadata(): PartialMetadata {
    return {
      owner: this.owner,
      name: this.name
    }
  }
  setMetadata = vi.fn((metadata: PartialMetadata): void => {
    Object.assign(this, metadata)
  })
  loadFiles = vi.fn(async (files: Files, _signal?: AbortSignal): Promise<void> => {
    void _signal
    this.filesRef.value = files
  })
  exportFiles = vi.fn((): Files => {
    return this.filesRef.value
  })
  export = vi.fn(async (_signal?: AbortSignal): Promise<ProjectSerialized> => {
    void _signal
    return this.mutex.runExclusive(async () => {
      return { metadata: this.getMetadata(), files: this.filesRef.value }
    })
  })
  load = vi.fn(async ({ metadata, files }: ProjectSerialized, _signal?: AbortSignal): Promise<void> => {
    void _signal
    await this.mutex.runExclusive(async () => {
      Object.assign(this, metadata)
      this.filesRef.value = { ...files }
    })
  })
}

/** Serialize and deserialize config */
export function sndConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config))
}

/** Serialize and deserialize files */
export function sndFiles(files: Files): Files {
  const newFiles: Files = {}
  for (const [path, file] of Object.entries(files)) {
    if (file == null) continue
    if (file.meta.universalUrl != null) {
      newFiles[path] = createFileWithUniversalUrl(file.meta.universalUrl)
    } else {
      newFiles[path] = new File(file.name, (signal?: AbortSignal) => file.arrayBuffer(signal), {
        type: file.type,
        lastModified: file.lastModified,
        meta: { ...file.meta }
      })
    }
  }
  return newFiles
}

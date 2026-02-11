import { vi } from 'vitest'
import { shallowRef } from 'vue'
import type { IProject, Metadata } from '@/models/project'
import { fromText, type File, type Files } from '../common/file'
import Mutex from '@/utils/mutex'

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
  private getMetadata(): Metadata {
    return {
      owner: this.owner,
      name: this.name
    }
  }
  setMetadata = vi.fn((metadata: Metadata): void => {
    Object.assign(this, metadata)
  })
  loadFiles = vi.fn(async (files: Files, _signal?: AbortSignal): Promise<void> => {
    void _signal
    this.filesRef.value = files
  })
  exportFiles = vi.fn((): Files => {
    return this.filesRef.value
  })
  export = vi.fn(async (_signal?: AbortSignal): Promise<[Metadata, Files]> => {
    void _signal
    return this.mutex.runExclusive(async () => {
      return [this.getMetadata(), this.filesRef.value]
    })
  })
  load = vi.fn(async (metadata: Metadata, files: Files, _signal?: AbortSignal): Promise<void> => {
    void _signal
    await this.mutex.runExclusive(async () => {
      Object.assign(this, metadata)
      this.filesRef.value = { ...files }
    })
  })
}

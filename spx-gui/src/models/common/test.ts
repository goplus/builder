import { vi } from 'vitest'
import { shallowReactive } from 'vue'
import type { IProject, Metadata } from '@/models/project'
import { fromText, type Files } from '../common/file'
import Mutex from '@/utils/mutex'

export function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

export class SimpleProject implements IProject {
  mutex = new Mutex()
  public files: Files
  constructor(
    public owner?: string,
    public name?: string,
    files: Files = {}
  ) {
    this.files = shallowReactive({ ...files })
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
    this.files = { ...files }
  })
  exportFiles = vi.fn((): Files => {
    return { ...this.files }
  })
  export = vi.fn(async (_signal?: AbortSignal): Promise<[Metadata, Files]> => {
    void _signal
    return this.mutex.runExclusive(async () => {
      return [this.getMetadata(), { ...this.files }]
    })
  })
  load = vi.fn(async (metadata: Metadata, files: Files, _signal?: AbortSignal): Promise<void> => {
    void _signal
    await this.mutex.runExclusive(async () => {
      Object.assign(this, metadata)
      this.files = { ...files }
    })
  })
}

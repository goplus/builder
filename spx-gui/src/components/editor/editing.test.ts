import { shallowReactive, ref, type WatchSource } from 'vue'
import { afterEach, beforeEach, describe, expect, vi, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { timeout } from '@/utils/utils'
import { fromText, type Files } from '@/models/common/file'
import { Editing, type EditableProject, SavingState, EditingMode, type LocalStorage } from './editing'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function mockFiles() {
  return shallowReactive({
    'file1.txt': mockFile('file1.txt'),
    'file2.txt': mockFile('file2.txt'),
    'file3.txt': mockFile('file3.txt')
  })
}

function mockProject({
  files,
  ...extra
}: Partial<{
  owner?: string
  files?: Files
  saveToCloud(signal?: AbortSignal): Promise<void>
  saveToLocalCache(key: string, signal?: AbortSignal): Promise<void>
}>): EditableProject {
  return {
    owner: 'user',
    exportGameFiles: () => ({ ...files }),
    saveToCloud: vi.fn().mockResolvedValue(undefined),
    saveToLocalCache: vi.fn().mockResolvedValue(undefined),
    ...extra
  }
}

function mockLocalStorage() {
  return {
    clear: vi.fn().mockResolvedValue(undefined)
  }
}

function makeEditing({
  project = mockProject({}),
  isOnline = () => true,
  signedInUsername: username = () => 'user',
  localCacheKey = 'LOCAL_CACHE_KEY',
  localStorage = mockLocalStorage()
}: Partial<{
  project: EditableProject
  isOnline: WatchSource<boolean>
  signedInUsername: WatchSource<string | null>
  localCacheKey: string
  localStorage: LocalStorage
}>) {
  return new Editing(project, isOnline, username, localCacheKey, localStorage)
}

describe('Editing', () => {
  const autoSaveToCloudDelay = 1500 + 1 // 1.5s + 1ms
  const retryAutoSaveToCloudDelay = 5000 + 1 // 5s + 1ms
  const autoSaveToLocalCacheDelay = 1000 + 1 // 1s + 1ms

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should do auto-save correctly', async () => {
    const files = mockFiles()
    const project = mockProject({
      files,
      saveToCloud: vi.fn(async (signal?: AbortSignal) => timeout(500, signal)),
      saveToLocalCache: vi.fn(async (localCacheKey: string, signal?: AbortSignal) => timeout(100, signal))
    })
    const localStorage = mockLocalStorage()
    const editing = makeEditing({ project, localStorage })
    editing.start()

    expect(editing.mode).toBe(EditingMode.AutoSave)
    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()
    expect(editing.dirty).toBe(true)
    expect(editing.saving?.state).toBe(SavingState.Pending)

    vi.advanceTimersByTime(autoSaveToLocalCacheDelay)
    await flushPromises()
    expect(project.saveToLocalCache).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(autoSaveToCloudDelay - autoSaveToLocalCacheDelay + 1)
    await flushPromises()
    expect(project.saveToCloud).toHaveBeenCalledTimes(1)
    expect(editing.saving?.state).toBe(SavingState.InProgress)

    vi.advanceTimersByTime(500)
    await flushPromises()
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
    expect(localStorage.clear).toHaveBeenCalledTimes(1)
    expect(localStorage.clear).toHaveBeenCalledWith('LOCAL_CACHE_KEY')
  })

  // https://github.com/goplus/builder/pull/794#discussion_r1728120369
  it('should handle failed auto-save-to-cloud correctly', async () => {
    const files = mockFiles()
    const project = mockProject({
      files,
      saveToCloud: vi
        .fn()
        .mockRejectedValueOnce(new Error('Cloud save failed'))
        .mockRejectedValueOnce(new Error('Cloud save failed again'))
        .mockResolvedValue(undefined)
    })
    const editing = makeEditing({ project })
    editing.start()

    files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()

    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(project.saveToCloud).toHaveBeenCalledTimes(1)
    expect(editing.saving?.state).toBe(SavingState.Failed)

    vi.advanceTimersByTime(retryAutoSaveToCloudDelay)
    await flushPromises()
    expect(project.saveToCloud).toHaveBeenCalledTimes(2)
    expect(editing.saving?.state).toBe(SavingState.Failed)

    vi.advanceTimersByTime(retryAutoSaveToCloudDelay)
    await flushPromises()
    expect(project.saveToCloud).toHaveBeenCalledTimes(3)
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
  })

  it('should cancel pending saving when editing is disposed', async () => {
    const files = mockFiles()
    const project = mockProject({ files })
    const editing = makeEditing({ project })
    editing.start()

    files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()

    editing.dispose()
    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(project.saveToLocalCache).toHaveBeenCalledTimes(0)
    expect(project.saveToCloud).toHaveBeenCalledTimes(0)
  })

  it('should abort previous saveToCloud call when a new one is initiated', async () => {
    const files = mockFiles()
    const project = mockProject({ files })
    const editing = makeEditing({ project })
    editing.start()

    files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()
    vi.advanceTimersByTime(100)
    files['file2.txt'] = mockFile('file2.txt updated')
    await flushPromises()
    vi.advanceTimersByTime(100)
    files['file3.txt'] = mockFile('file3.txt updated')
    await flushPromises()

    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
    expect(project.saveToLocalCache).toHaveBeenCalledTimes(1)
    expect(project.saveToCloud).toHaveBeenCalledTimes(1)
  })

  it('should not trigger auto-save for effect-free mode', async () => {
    const files = mockFiles()
    const project = mockProject({ files, owner: 'project-owner' })
    const editing = makeEditing({
      project,
      signedInUsername: () => 'different-user' // Different user from project owner
    })
    editing.start()

    expect(editing.mode).toBe(EditingMode.EffectFree)
    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    // Make changes to files
    files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()

    // Advance time to when auto-save would normally trigger
    vi.advanceTimersByTime(autoSaveToLocalCacheDelay)
    await flushPromises()
    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()

    // Auto-save should not have been triggered
    expect(project.saveToLocalCache).toHaveBeenCalledTimes(0)
    expect(project.saveToCloud).toHaveBeenCalledTimes(0)
    expect(editing.dirty).toBe(true) // Files are dirty, but no saving is triggered
    expect(editing.saving).toBeNull()
  })

  it('should wait for online when during auto-save', async () => {
    const files = mockFiles()
    const project = mockProject({
      files,
      saveToCloud: vi.fn(async (signal?: AbortSignal) => timeout(500, signal)) // Add delay to mock save
    })
    const isOnline = ref(false) // Start offline
    const editing = makeEditing({ project, isOnline })
    editing.start()

    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    // Make changes to files
    files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()
    expect(editing.dirty).toBe(true)
    expect(editing.saving?.state).toBe(SavingState.Pending)

    // Local cache save should happen
    vi.advanceTimersByTime(autoSaveToLocalCacheDelay)
    await flushPromises()
    expect(project.saveToLocalCache).toHaveBeenCalledTimes(1)

    // Advance time past cloud save delay, but still offline
    vi.advanceTimersByTime(autoSaveToCloudDelay - autoSaveToLocalCacheDelay + 1)
    await flushPromises()

    // Cloud save should not have been called yet because we're offline
    expect(project.saveToCloud).toHaveBeenCalledTimes(0)
    expect(editing.dirty).toBe(true)
    expect(editing.saving?.state).toBe(SavingState.Pending)

    // Go online
    isOnline.value = true
    await flushPromises()

    // Now cloud save should be triggered and in progress
    expect(project.saveToCloud).toHaveBeenCalledTimes(1)
    expect(editing.saving?.state).toBe(SavingState.InProgress)

    // Wait for save to complete
    vi.advanceTimersByTime(500)
    await flushPromises()
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
  })
})

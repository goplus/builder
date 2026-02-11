import { ref, type WatchSource } from 'vue'
import { afterEach, beforeEach, describe, expect, vi, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { timeout } from '@/utils/utils'
import { type Files } from '@/models/common/file'
import type { CloudHelpers } from '@/models/common/cloud'
import { mockFile, MockProject } from '@/models/common/test'
import type { IProject } from '@/models/project'
import { Editing, SavingState, EditingMode, type ILocalCache } from './editing'

function makeFiles() {
  return {
    'file1.txt': mockFile('file1.txt'),
    'file2.txt': mockFile('file2.txt'),
    'file3.txt': mockFile('file3.txt')
  }
}

function makeProject({
  files = makeFiles(),
  owner,
  name
}: {
  owner?: string
  name?: string
  files?: Files
} = {}) {
  return new MockProject(owner, name, files)
}

function makeCloudHelper(): CloudHelpers {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined)
  }
}

function makeLocalCache(): ILocalCache {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined)
  }
}

function makeEditing({
  project = makeProject({}),
  mode = EditingMode.AutoSave,
  isOnline = () => true,
  cloudHelper = makeCloudHelper(),
  localCacheHelper = makeLocalCache()
}: Partial<{
  project: IProject
  mode: EditingMode
  isOnline: WatchSource<boolean>
  cloudHelper: CloudHelpers
  localCacheHelper: ILocalCache
}>) {
  return new Editing(mode, project, cloudHelper, localCacheHelper, isOnline)
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
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.save).mockImplementation((project: IProject, signal?: AbortSignal) => timeout(500, signal))
    const localCacheHelper = makeLocalCache()
    vi.mocked(localCacheHelper.save).mockImplementation((project: IProject, signal?: AbortSignal) =>
      timeout(100, signal)
    )
    const project = makeProject()
    const editing = makeEditing({ project, localCacheHelper, cloudHelper })
    editing.start()

    expect(editing.mode).toBe(EditingMode.AutoSave)
    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    project.files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()
    expect(editing.dirty).toBe(true)
    expect(editing.saving?.state).toBe(SavingState.Pending)

    vi.advanceTimersByTime(autoSaveToLocalCacheDelay)
    await flushPromises()
    expect(localCacheHelper.save).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(autoSaveToCloudDelay - autoSaveToLocalCacheDelay + 1)
    await flushPromises()
    expect(cloudHelper.save).toHaveBeenCalledTimes(1)
    expect(editing.saving?.state).toBe(SavingState.InProgress)

    vi.advanceTimersByTime(500)
    await flushPromises()
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
    expect(localCacheHelper.clear).toHaveBeenCalledTimes(1)
  })

  // https://github.com/goplus/builder/pull/794#discussion_r1728120369
  it('should handle failed auto-save-to-cloud correctly', async () => {
    const project = makeProject()
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.save)
      .mockRejectedValueOnce(new Error('Cloud save failed'))
      .mockRejectedValueOnce(new Error('Cloud save failed again'))
      .mockResolvedValue(undefined)
    const editing = makeEditing({ project, cloudHelper })
    editing.start()

    project.files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()

    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(cloudHelper.save).toHaveBeenCalledTimes(1)
    expect(editing.saving?.state).toBe(SavingState.Failed)

    vi.advanceTimersByTime(retryAutoSaveToCloudDelay)
    await flushPromises()
    expect(cloudHelper.save).toHaveBeenCalledTimes(2)
    expect(editing.saving?.state).toBe(SavingState.Failed)

    vi.advanceTimersByTime(retryAutoSaveToCloudDelay)
    await flushPromises()
    expect(cloudHelper.save).toHaveBeenCalledTimes(3)
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
  })

  it('should cancel pending saving when editing is disposed', async () => {
    const project = makeProject()
    const cloudHelper = makeCloudHelper()
    const localCacheHelper = makeLocalCache()
    const editing = makeEditing({ project, localCacheHelper, cloudHelper })
    editing.start()

    project.files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()

    editing.dispose()
    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(localCacheHelper.save).toHaveBeenCalledTimes(0)
    expect(cloudHelper.save).toHaveBeenCalledTimes(0)
  })

  it('should abort previous saveToCloud call when a new one is initiated', async () => {
    const project = makeProject()
    const cloudHelper = makeCloudHelper()
    const localCacheHelper = makeLocalCache()
    const editing = makeEditing({ project, localCacheHelper, cloudHelper })
    editing.start()

    project.files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()
    vi.advanceTimersByTime(100)
    project.files['file2.txt'] = mockFile('file2.txt updated')
    await flushPromises()
    vi.advanceTimersByTime(100)
    project.files['file3.txt'] = mockFile('file3.txt updated')
    await flushPromises()

    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
    expect(localCacheHelper.save).toHaveBeenCalledTimes(1)
    expect(cloudHelper.save).toHaveBeenCalledTimes(1)
  })

  it('should not trigger auto-save for effect-free mode', async () => {
    const project = makeProject({ owner: 'project-owner' })
    const cloudHelper = makeCloudHelper()
    const localCacheHelper = makeLocalCache()
    const editing = makeEditing({
      project,
      mode: EditingMode.EffectFree,
      localCacheHelper,
      cloudHelper
    })
    editing.start()

    expect(editing.mode).toBe(EditingMode.EffectFree)
    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    // Make changes to files
    project.files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()

    // Advance time to when auto-save would normally trigger
    vi.advanceTimersByTime(autoSaveToLocalCacheDelay)
    await flushPromises()
    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()

    // Auto-save should not have been triggered
    expect(localCacheHelper.save).toHaveBeenCalledTimes(0)
    expect(cloudHelper.save).toHaveBeenCalledTimes(0)
    expect(editing.dirty).toBe(true) // Files are dirty, but no saving is triggered
    expect(editing.saving).toBeNull()
  })

  it('should wait for online when during auto-save', async () => {
    const project = makeProject()
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.save).mockImplementation((project: IProject, signal?: AbortSignal) => timeout(500, signal))
    const isOnline = ref(false) // Start offline
    const localCacheHelper = makeLocalCache()
    const editing = makeEditing({ project, isOnline, localCacheHelper, cloudHelper })
    editing.start()

    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    // Make changes to files
    project.files['file1.txt'] = mockFile('file1.txt updated')
    await flushPromises()
    expect(editing.dirty).toBe(true)
    expect(editing.saving?.state).toBe(SavingState.Pending)

    // Local cache save should happen
    vi.advanceTimersByTime(autoSaveToLocalCacheDelay)
    await flushPromises()
    expect(localCacheHelper.save).toHaveBeenCalledTimes(1)

    // Advance time past cloud save delay, but still offline
    vi.advanceTimersByTime(autoSaveToCloudDelay - autoSaveToLocalCacheDelay + 1)
    await flushPromises()

    // Cloud save should not have been called yet because we're offline
    expect(cloudHelper.save).toHaveBeenCalledTimes(0)
    expect(editing.dirty).toBe(true)
    expect(editing.saving?.state).toBe(SavingState.Pending)

    // Go online
    isOnline.value = true
    await flushPromises()

    // Now cloud save should be triggered and in progress
    expect(cloudHelper.save).toHaveBeenCalledTimes(1)
    expect(editing.saving?.state).toBe(SavingState.InProgress)

    // Wait for save to complete
    vi.advanceTimersByTime(500)
    await flushPromises()
    expect(editing.dirty).toBe(false)
    expect(editing.saving?.state).toBe(SavingState.Completed)
  })
})

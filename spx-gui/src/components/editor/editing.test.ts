import { ref, type WatchSource } from 'vue'
import { afterEach, beforeEach, describe, expect, vi, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { timeout } from '@/utils/utils'
import { Cancelled } from '@/utils/exception'
import { ProgressReporter } from '@/utils/progress'
import type { QueryRet } from '@/utils/query'
import { ProjectType, Visibility, type ProjectData } from '@/apis/project'
import { type Files } from '@/models/common/file'
import type { CloudHelpers, PreferPublishedContent } from '@/models/common/cloud'
import { mockFile, MockProject } from '@/models/common/test'
import type { IProject, Metadata, ProjectSerialized } from '@/models/project'
import { makeSignedInState, makeSignedInStateQuery } from '@/stores/user/test'
import type { SignedInState } from '@/stores/user'
import { Editing, SavingState, EditingMode, type ILocalCache, type UIHelpersForLoadingProject } from './editing'

function makeFiles() {
  return {
    'file1.txt': mockFile('file1.txt'),
    'file2.txt': mockFile('file2.txt'),
    'file3.txt': mockFile('file3.txt')
  }
}

function makeProject({
  files = makeFiles(),
  owner = 'owner',
  name = 'project'
}: {
  owner?: string
  name?: string
  files?: Files
} = {}) {
  return new MockProject(owner, name, files)
}

function makeCloudSerialized(owner: string, name: string, version: number = 1): ProjectSerialized<Metadata> {
  return {
    metadata: {
      id: 'project-id',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      owner,
      remixedFrom: null,
      name,
      type: ProjectType.Game,
      displayName: name,
      version,
      visibility: Visibility.Private,
      description: '',
      instructions: '',
      extraSettings: {},
      thumbnail: null,
      viewCount: 0,
      likeCount: 0,
      releaseCount: 0,
      remixCount: 0,
      aiDescription: null,
      aiDescriptionHash: null
    },
    files: { 'main.spx': mockFile('main.spx') }
  }
}

function makeLocalSerialized(owner: string, name: string, version?: number): ProjectSerialized {
  return {
    metadata: { owner, name, version },
    files: { 'main.spx': mockFile('main.spx') }
  }
}

function makeCloudHelper(): CloudHelpers {
  return {
    load: vi.fn().mockResolvedValue(makeCloudSerialized('owner', 'project')),
    save: vi.fn().mockResolvedValue({ metadata: {}, files: {} })
  }
}

function makeLocalCache(data: ProjectSerialized | null = null): ILocalCache {
  return {
    load: vi.fn().mockImplementation(() => Promise.resolve(data)),
    save: vi.fn().mockImplementation(async (serialized) => {
      data = serialized
    }),
    clear: vi.fn().mockImplementation(async () => {
      data = null
    })
  }
}

function makeEditing({
  project = makeProject({}),
  isOnline = () => true,
  cloudHelper = makeCloudHelper(),
  localCacheHelper = makeLocalCache(),
  signedInStateQuery = makeSignedInStateQuery(makeSignedInState(project.owner ?? null))
}: Partial<{
  project: IProject
  isOnline: WatchSource<boolean>
  cloudHelper: CloudHelpers
  localCacheHelper: ILocalCache
  signedInStateQuery: QueryRet<SignedInState>
}>) {
  return new Editing(project, cloudHelper, localCacheHelper, isOnline, signedInStateQuery)
}

// Extract the latest preferPublishedContent argument passed to cloudHelper.load.
function getLatestPreferPublishedContent(
  load: CloudHelpers['load']
): Exclude<NonNullable<Parameters<CloudHelpers['load']>[2]>, boolean> {
  const preferPublishedContent = vi.mocked(load).mock.lastCall?.[2]
  if (typeof preferPublishedContent !== 'function') {
    throw new Error('preferPublishedContent function expected')
  }
  return preferPublishedContent
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
    vi.mocked(cloudHelper.save).mockImplementation(({ metadata, files }: ProjectSerialized, signal?: AbortSignal) =>
      timeout(500, signal).then(() => ({ metadata, files }))
    )
    const localCacheHelper = makeLocalCache()
    vi.mocked(localCacheHelper.save).mockImplementation((_serialized: ProjectSerialized, signal?: AbortSignal) =>
      timeout(100, signal)
    )
    const project = makeProject()
    const editing = makeEditing({ project, localCacheHelper, cloudHelper })
    editing.startEditing()

    expect(editing.mode).toBe(EditingMode.AutoSave)
    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    project.setFile('file1.txt', mockFile('file1.txt updated'))
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
      .mockResolvedValue({ metadata: {}, files: {} })
    const editing = makeEditing({ project, cloudHelper })
    editing.startEditing()

    project.setFile('file1.txt', mockFile('file1.txt updated'))
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
    editing.startEditing()

    project.setFile('file1.txt', mockFile('file1.txt updated'))
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
    editing.startEditing()

    project.setFile('file1.txt', mockFile('file1.txt updated'))
    await flushPromises()
    vi.advanceTimersByTime(100)
    project.setFile('file2.txt', mockFile('file2.txt updated'))
    await flushPromises()
    vi.advanceTimersByTime(100)
    project.setFile('file3.txt', mockFile('file3.txt updated'))
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
      localCacheHelper,
      cloudHelper,
      signedInStateQuery: makeSignedInStateQuery(makeSignedInState('different-user')) // Not the owner
    })
    editing.startEditing()

    expect(editing.mode).toBe(EditingMode.EffectFree)
    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    // Make changes to files
    project.setFile('file1.txt', mockFile('file1.txt updated'))
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

  it('should update mode and trigger auto-save when signed-in username changes to owner', async () => {
    const project = makeProject({ owner: 'project-owner' })
    const cloudHelper = makeCloudHelper()
    const localCacheHelper = makeLocalCache()
    const signedInStateQuery = makeSignedInStateQuery(makeSignedInState('different-user'))
    const editing = makeEditing({
      project,
      localCacheHelper,
      cloudHelper,
      signedInStateQuery
    })
    editing.startEditing()

    expect(editing.mode).toBe(EditingMode.EffectFree)

    project.setFile('file1.txt', mockFile('file1.txt updated'))
    await flushPromises()
    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(cloudHelper.save).toHaveBeenCalledTimes(0)

    signedInStateQuery.data.value = makeSignedInState('project-owner')
    await flushPromises()
    expect(editing.mode).toBe(EditingMode.AutoSave)

    vi.advanceTimersByTime(autoSaveToLocalCacheDelay)
    await flushPromises()
    expect(localCacheHelper.save).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(autoSaveToCloudDelay - autoSaveToLocalCacheDelay + 1)
    await flushPromises()
    expect(cloudHelper.save).toHaveBeenCalledTimes(1)
  })

  it('should not trigger auto-save when mode changes without dirty files', async () => {
    const project = makeProject({ owner: 'project-owner' })
    const cloudHelper = makeCloudHelper()
    const localCacheHelper = makeLocalCache()
    const signedInStateQuery = makeSignedInStateQuery(makeSignedInState('different-user'))
    const editing = makeEditing({
      project,
      localCacheHelper,
      cloudHelper,
      signedInStateQuery
    })
    editing.startEditing()

    expect(editing.mode).toBe(EditingMode.EffectFree)

    signedInStateQuery.data.value = makeSignedInState('project-owner')
    await flushPromises()

    expect(editing.mode).toBe(EditingMode.AutoSave)

    vi.advanceTimersByTime(autoSaveToCloudDelay)
    await flushPromises()
    expect(localCacheHelper.save).toHaveBeenCalledTimes(0)
    expect(cloudHelper.save).toHaveBeenCalledTimes(0)
    expect(editing.saving).toBeNull()
  })

  it('should wait for online when during auto-save', async () => {
    const project = makeProject()
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.save).mockImplementation(({ metadata, files }: ProjectSerialized, signal?: AbortSignal) =>
      timeout(500, signal).then(() => ({ metadata, files }))
    )
    const isOnline = ref(false) // Start offline
    const localCacheHelper = makeLocalCache()
    const editing = makeEditing({ project, isOnline, localCacheHelper, cloudHelper })
    editing.startEditing()

    expect(editing.dirty).toBe(false)
    expect(editing.saving).toBeNull()

    // Make changes to files
    project.setFile('file1.txt', mockFile('file1.txt updated'))
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

describe('Editing.loadProject', () => {
  function makeReporter() {
    return new ProgressReporter(() => {})
  }

  function makeUIHelpers(overrides?: Partial<UIHelpersForLoadingProject>): UIHelpersForLoadingProject {
    return {
      confirmOpenTargetWithAnotherInCache: vi.fn().mockResolvedValue(true),
      openProject: vi.fn(),
      ...overrides
    }
  }

  it('should load project from cloud when no local cache exists', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache()

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    const ac = new AbortController()
    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), ac.signal)

    expect(cloudHelper.load).toHaveBeenCalledWith('alice', 'my-project', expect.any(Function), ac.signal)
    expect(project.load).toHaveBeenCalledWith(cloudData, ac.signal)
  })

  it('should load project from cloud and clear local cache when local cache loading fails', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache()
    vi.mocked(localCacheHelper.load).mockRejectedValue(new Error('Local cache load failed'))

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    const ac = new AbortController()
    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), ac.signal)

    expect(cloudHelper.load).toHaveBeenCalledWith('alice', 'my-project', expect.any(Function), ac.signal)
    expect(project.load).toHaveBeenCalledWith(cloudData, ac.signal)
    expect(localCacheHelper.clear).toHaveBeenCalled()
  })

  it('should prefer local cache when local version is newer than cloud version', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const localData = makeLocalSerialized('alice', 'my-project', 2)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), new AbortController().signal)

    expect(project.load).toHaveBeenCalledWith(localData, expect.anything())
  })

  it('should prefer cloud data and clear cache when cloud version is newer', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 3)
    const localData = makeLocalSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), new AbortController().signal)

    expect(project.load).toHaveBeenCalledWith(cloudData, expect.anything())
    expect(localCacheHelper.clear).toHaveBeenCalled()
  })

  it('should clear cache and load from cloud when cache owner mismatches', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const localData = makeLocalSerialized('bob', 'my-project', 2)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), new AbortController().signal)

    expect(localCacheHelper.clear).toHaveBeenCalled()
    expect(project.load).toHaveBeenCalledWith(cloudData, expect.anything())
  })

  it('should clear cache and load from cloud when cache name mismatches', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const localData = makeLocalSerialized('alice', 'other-project', 2)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    const helpers = makeUIHelpers()
    vi.mocked(helpers.confirmOpenTargetWithAnotherInCache).mockResolvedValue(true)

    await editing.loadProject('alice', 'my-project', helpers, makeReporter(), new AbortController().signal)

    expect(helpers.confirmOpenTargetWithAnotherInCache).toHaveBeenCalledWith('my-project', 'other-project')
    expect(localCacheHelper.clear).toHaveBeenCalled()
    expect(project.load).toHaveBeenCalledWith(cloudData, expect.anything())
  })

  it('should treat project name input with different casing as the same project after cloud resolution', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const localData = makeLocalSerialized('alice', 'my-project', 2)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    const helpers = makeUIHelpers()

    await editing.loadProject('alice', 'My-Project', helpers, makeReporter(), new AbortController().signal)

    expect(helpers.confirmOpenTargetWithAnotherInCache).not.toHaveBeenCalled()
    expect(localCacheHelper.clear).not.toHaveBeenCalled()
    expect(project.load).toHaveBeenCalledWith(localData, expect.anything())
  })

  it('should open cached project and throw Cancelled when user chooses cached project over target', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const localData = makeLocalSerialized('alice', 'cached-project', 2)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    const helpers = makeUIHelpers()
    vi.mocked(helpers.confirmOpenTargetWithAnotherInCache).mockResolvedValue(false)

    await expect(
      editing.loadProject('alice', 'my-project', helpers, makeReporter(), new AbortController().signal)
    ).rejects.toThrow(Cancelled)
    expect(localCacheHelper.clear).not.toHaveBeenCalled()
    expect(helpers.openProject).toHaveBeenCalledWith('alice', 'cached-project')
    expect(project.load).not.toHaveBeenCalled()
  })

  it('should load project when the model starts without owner or name', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const project = new MockProject(undefined, undefined, makeFiles())
    const editing = makeEditing({
      project,
      cloudHelper,
      signedInStateQuery: makeSignedInStateQuery(makeSignedInState('alice'))
    })

    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), new AbortController().signal)

    expect(project.load).toHaveBeenCalledWith(cloudData, expect.anything())
    expect(editing.mode).toBe(EditingMode.AutoSave)
  })

  it('should set preferPublishedContent to false when signed-in user is the owner', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache()

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = new Editing(
      project,
      cloudHelper,
      localCacheHelper,
      () => true,
      makeSignedInStateQuery(makeSignedInState('alice'))
    )

    const ac = new AbortController()
    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), ac.signal)

    expect(cloudHelper.load).toHaveBeenCalledWith('alice', 'my-project', expect.any(Function), ac.signal)
    const preferPublishedContent = getLatestPreferPublishedContent(cloudHelper.load)
    await expect(preferPublishedContent({ owner: 'alice' } as ProjectData)).resolves.toBe(false)
  })

  it('should set preferPublishedContent to true when signed-in user is not the owner', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache()

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = new Editing(
      project,
      cloudHelper,
      localCacheHelper,
      () => true,
      makeSignedInStateQuery(makeSignedInState('bob'))
    )

    const ac = new AbortController()
    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), ac.signal)

    expect(cloudHelper.load).toHaveBeenCalledWith('alice', 'my-project', expect.any(Function), ac.signal)
    const preferPublishedContent = getLatestPreferPublishedContent(cloudHelper.load)
    await expect(preferPublishedContent({ owner: 'alice' } as ProjectData)).resolves.toBe(true)
  })

  it('should start loading from cloud before signed-in state resolves', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockImplementation(async (_owner, _name, preferPublishedContent) => {
      expect(preferPublishedContent).toBeTypeOf('function')
      await (preferPublishedContent as Exclude<PreferPublishedContent, boolean>)({ owner: 'alice' } as ProjectData)
      return cloudData
    })
    const localCacheHelper = makeLocalCache()
    const signedInStateQuery = makeSignedInStateQuery(null)
    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = new Editing(project, cloudHelper, localCacheHelper, () => true, signedInStateQuery)

    const ac = new AbortController()
    const loadPromise = editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), ac.signal)
    await flushPromises()

    expect(cloudHelper.load).toHaveBeenCalledWith('alice', 'my-project', expect.any(Function), ac.signal)
    expect(project.load).not.toHaveBeenCalled()

    signedInStateQuery.data.value = makeSignedInState('alice')
    signedInStateQuery.isLoading.value = false

    await loadPromise

    const preferPublishedContent = getLatestPreferPublishedContent(cloudHelper.load)
    await expect(preferPublishedContent({ owner: 'alice' } as ProjectData)).resolves.toBe(false)
  })

  it('should treat owner input with different casing as the same owner', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const localData = makeLocalSerialized('alice', 'my-project', 2)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = new MockProject(undefined, undefined, makeFiles())
    const editing = makeEditing({
      project,
      cloudHelper,
      localCacheHelper,
      signedInStateQuery: makeSignedInStateQuery(makeSignedInState('alice'))
    })

    const ac = new AbortController()
    await editing.loadProject('Alice', 'my-project', makeUIHelpers(), makeReporter(), ac.signal)

    expect(cloudHelper.load).toHaveBeenCalledWith('Alice', 'my-project', expect.any(Function), ac.signal)
    const preferPublishedContent = getLatestPreferPublishedContent(cloudHelper.load)
    await expect(preferPublishedContent({ owner: 'alice' } as ProjectData)).resolves.toBe(false)
    expect(localCacheHelper.clear).not.toHaveBeenCalled()
    expect(project.load).toHaveBeenCalledWith(localData, expect.anything())
    expect(editing.mode).toBe(EditingMode.AutoSave)
  })

  it('should prefer local cache when cloud and local versions are equal', async () => {
    const cloudData = makeCloudSerialized('alice', 'my-project', 1)
    const localData = makeLocalSerialized('alice', 'my-project', 1)
    const cloudHelper = makeCloudHelper()
    vi.mocked(cloudHelper.load).mockResolvedValue(cloudData)
    const localCacheHelper = makeLocalCache(localData)

    const project = makeProject({ owner: 'alice', name: 'my-project' })
    const editing = makeEditing({ project, cloudHelper, localCacheHelper })

    await editing.loadProject('alice', 'my-project', makeUIHelpers(), makeReporter(), new AbortController().signal)

    // Equal versions keep the local cache to preserve unsaved local work.
    expect(project.load).toHaveBeenCalledWith(localData, expect.anything())
  })
})

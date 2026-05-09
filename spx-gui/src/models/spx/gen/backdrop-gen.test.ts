import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ArtStyle, BackdropCategory, Perspective } from '@/apis/common'
import { setupAigcMock } from './aigc-mock' // Put me before importing `@/apis/aigc` to ensure the mock is set up correctly
import { TaskStatus, TaskType } from '@/apis/aigc'
import { createI18n } from '@/utils/i18n'
import { sndFiles } from '@/models/common/test'
import { GenState } from '@/components/editor/gen'
import { makeSpxProject } from '../common/test'
import { BackdropGen } from './backdrop-gen'

const aigcMock = setupAigcMock()
const i18n = createI18n({ lang: 'en' })

describe('BackdropGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeSpxProject()

    // 1. Create BackdropGen with initial description
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'A sunny beach with palm trees and clear blue water' }
    })
    expect(gen.settings.description).toBe('A sunny beach with palm trees and clear blue water')
    expect(gen.enrichState.status).toBe('initial')
    expect(gen.imagesGenState.status).toBe('initial')

    // 2. User updates description
    gen.setSettings({ description: 'A majestic mountain range under a clear blue sky' })
    expect(gen.settings.description).toBe('A majestic mountain range under a clear blue sky')

    // 3. Enrich settings based on input
    const enriched = gen.enrich()
    expect(gen.enrichState.status).toBe('running')
    await enriched
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.enrichState.result).toEqual({
      name: 'enriched-backdrop',
      category: BackdropCategory.Unspecified,
      description: 'Enriched description for A majestic mountain range under a clear blue sky',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })

    // 4. User updates some settings
    gen.setSettings({
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown,
      description: 'A fantastic backdrop of a river flowing through a lush forest'
    })

    // 5. Generate backdrop images
    const generated = gen.genImages()
    expect(gen.imagesGenState.status).toBe('running')
    await generated
    expect(gen.imagesGenState.status).toBe('finished')
    expect(gen.imagesGenState.result?.length).toBe(4)

    // 6. Select one generated image
    gen.setImageIndex(2)
    expect(gen.image).toBe(gen.imagesGenState.result![2])

    // 7. Finish the backdrop generation
    const backdrop = await gen.finish()
    expect(backdrop.name).toBe('enriched-backdrop')
    expect(backdrop.assetMetadata).toEqual({
      description: 'A fantastic backdrop of a river flowing through a lush forest',
      extraSettings: {
        category: BackdropCategory.Unspecified,
        artStyle: ArtStyle.FlatDesign,
        perspective: Perspective.AngledTopDown
      }
    })
  })

  it('should handle errors and retry successfully', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'A beautiful sunset over mountains' }
    })

    // 1. First enrich attempt fails
    aigcMock.injectErrorOnce('enrichBackdropSettings', new Error('Network error'))
    const enrichPromise1 = gen.enrich()
    await expect(enrichPromise1).rejects.toThrow('Network error')
    expect(gen.enrichState.status).toBe('failed')

    // 2. Retry enrich and succeed
    const enrichPromise2 = gen.enrich()
    expect(gen.enrichState.status).toBe('running')
    await enrichPromise2
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.enrichState.result?.name).toBe('enriched-backdrop')

    // 3. First genImages attempt fails
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Task processing error'))
    const genImagesPromise1 = gen.genImages()
    await expect(genImagesPromise1).rejects.toThrow('Task processing error')
    expect(gen.imagesGenState.status).toBe('failed')

    // 4. Retry genImages and succeed
    const genImagesPromise2 = gen.genImages()
    expect(gen.imagesGenState.status).toBe('running')
    await genImagesPromise2
    expect(gen.imagesGenState.status).toBe('finished')
    expect(gen.imagesGenState.result?.length).toBe(4)

    // 5. Finish successfully
    gen.setImageIndex(0)
    const backdrop = await gen.finish()
    expect(backdrop.name).toBe('enriched-backdrop')
  })

  it('should validate backdrop name when parent is set', () => {
    const i18n = createI18n({ lang: 'en' })
    const project = makeSpxProject()
    const genState = new GenState(i18n, project)

    const gen1 = new BackdropGen(i18n, project, {
      settings: { name: 'forest' }
    })
    genState.addBackdrop(gen1)

    const gen2 = new BackdropGen(i18n, project, {
      settings: { name: 'desert' }
    })
    genState.addBackdrop(gen2)

    // Should throw when trying to set a name that conflicts with another gen in the same GenState
    expect(() => gen2.setName('forest')).toThrow()

    // Should allow setting a unique name
    gen2.setName('ocean')
    expect(gen2.settings.name).toBe('ocean')
  })

  it('should throw error when finishing without image', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'A test backdrop' }
    })

    await gen.enrich()
    await gen.genImages()

    // Try to finish without setting image
    await expect(gen.finish()).rejects.toThrow('image expected')
  })

  it('should throw error when recording adoption without result', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'A test backdrop' }
    })

    await gen.enrich()
    await gen.genImages()

    // Try to record adoption without finishing
    await expect(gen.recordAdoption()).rejects.toThrow('result backdrop expected')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'First description' }
    })

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should forward ui language to enrich api', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(createI18n({ lang: 'zh' }), project, {
      settings: { description: 'A test backdrop' }
    })

    await gen.enrich()
    expect(vi.mocked(aigcMock.enrichBackdropSettings).mock.calls.at(-1)?.[3]).toBe('zh')
  })

  it('should allow multiple image generations', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'A test backdrop' }
    })

    await gen.enrich()

    await gen.genImages()
    const firstBatch = gen.imagesGenState.result
    expect(firstBatch?.length).toBe(4)

    gen.setSettings({ artStyle: ArtStyle.FlatDesign })
    await gen.genImages()
    const secondBatch = gen.imagesGenState.result
    expect(secondBatch?.length).toBe(4)
    expect(secondBatch).not.toBe(firstBatch)
  })

  it('should cancel running image generation', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'A test backdrop' }
    })
    const tasks = aigcMock.tasks

    const waitForTask = aigcMock.waitForTaskCount(1)
    const genImagesPromise = gen.genImages()
    await waitForTask

    await gen.cancel()
    await expect(genImagesPromise).rejects.toThrow('cancelled')

    const lastRecord = Array.from(tasks.values()).at(-1)
    expect(lastRecord?.task.status).toBe(TaskStatus.Cancelled)
  })

  it('should export and load correctly while enrich is running', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'Enrich running test' }
    })

    const enrichPromise = gen.enrich()
    expect(gen.enrichState.status).toBe('running')

    const rawFiles = gen.export()
    const files = sndFiles(rawFiles)
    const loadedGen = await BackdropGen.load(gen.name, i18n, project, files)

    // `Phase.export` serializes running state to initial for retry/recovery
    expect(loadedGen.enrichState.status).toBe('initial')
    expect(loadedGen.imagesGenState.status).toBe('initial')
    expect(loadedGen.result).toBeNull()
    expect(loadedGen.settings.description).toBe('Enrich running test')

    await enrichPromise
  })

  it('should export and load correctly after enrich finished but before image generation', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'Enrich finished pre-gen test' }
    })

    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.imagesGenState.status).toBe('initial')
    expect(gen.result).toBeNull()

    const rawFiles = gen.export()
    const files = sndFiles(rawFiles)
    const loadedGen = await BackdropGen.load(gen.name, i18n, project, files)

    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.enrichState.result).toEqual(gen.enrichState.result)
    expect(loadedGen.imagesGenState.status).toBe('initial')
    expect(loadedGen.imageIndex).toBeNull()
    expect(loadedGen.result).toBeNull()
  })

  it('should export and load correctly after genImages finished but before finish', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'Generated pre-finish test' }
    })

    await gen.enrich()
    await gen.genImages()
    gen.setImageIndex(1)

    expect(gen.imagesGenState.status).toBe('finished')
    expect(gen.imagesGenState.result?.length).toBe(4)
    expect(gen.result).toBeNull()

    const rawFiles = gen.export()
    const files = sndFiles(rawFiles)
    const loadedGen = await BackdropGen.load(gen.name, i18n, project, files)

    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.imagesGenState.status).toBe('finished')
    expect(loadedGen.imagesGenState.result?.length).toBe(4)
    expect(loadedGen.imageIndex).toBe(1)
    expect(loadedGen.image).toBe(loadedGen.imagesGenState.result?.[1] ?? null)
    expect(typeof loadedGen.image?.arrayBuffer).toBe('function')
    expect(loadedGen.result).toBeNull()
  })

  it('should export and load correctly', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'A test backdrop' }
    })

    // 1. Enrich
    await gen.enrich()

    // 2. Generate Images
    await gen.genImages()
    gen.setImageIndex(0)
    expect(gen.imageIndex).toBe(0)

    // 3. Finish
    await gen.finish()

    // 4. Export
    const rawFiles = gen.export()
    const files = sndFiles(rawFiles)

    // 5. Load
    const loadedGen = await BackdropGen.load(gen.name, i18n, project, files)
    await flushPromises()

    // Verify basic properties
    expect(loadedGen.id).toBe(gen.id)
    expect(loadedGen.settings).toEqual(gen.settings)
    expect(loadedGen.imageIndex).toBe(gen.imageIndex)

    // Verify Phases
    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.enrichState.result).toEqual(gen.enrichState.result)

    expect(loadedGen.imagesGenState.status).toBe('finished')
    expect(loadedGen.imagesGenState.result?.length).toBe(gen.imagesGenState.result?.length)

    // Validate File objects
    const firstImage = loadedGen.image!
    expect(firstImage).toBeDefined()
    expect(typeof firstImage.arrayBuffer).toBe('function')

    // Verify Result restoration in detail
    expect(loadedGen.result).not.toBeNull()
    expect(loadedGen.result).not.toBe(gen.result)
    expect(loadedGen.result?.id).toBe(gen.result?.id)
    expect(loadedGen.result?.name).toBe(gen.result?.name)
    expect(loadedGen.result?.bitmapResolution).toBe(gen.result?.bitmapResolution)
    expect(loadedGen.result?.assetMetadata).toEqual(gen.result?.assetMetadata)

    const loadedResultImg = loadedGen.result!.img
    const originResultImg = gen.result!.img
    expect(loadedResultImg).not.toBe(originResultImg)
    expect(typeof loadedResultImg.arrayBuffer).toBe('function')
    expect(loadedResultImg.meta.universalUrl).toBe(originResultImg.meta.universalUrl)
  })

  it('should export and load running state correctly', async () => {
    const project = makeSpxProject()
    const gen = new BackdropGen(i18n, project, {
      settings: { description: 'Running test' }
    })

    // Register a custom task handler to pause execution
    let resolveTask: (() => void) | null = null
    const taskPaused = new Promise<void>((r) => {
      resolveTask = r
    })

    aigcMock.registerTaskHandler(TaskType.GenerateBackdrop, async function* (task, _params, defaultHandler) {
      // Wait until we allow it to proceed
      await taskPaused
      yield* defaultHandler()
    })

    // 1. Start generation (will pause inside task handler)
    const genPromise = gen.genImages()

    // Wait for task to start and status to be updated (snapshot yielded)
    // Since `genImages` awaits `start` and then `untilCompleted`, and `untilCompleted` subscribes...
    // The subscription will yield Snapshot immediately as per our handler above.
    // However, we need to ensure local state is updated.
    // `Task` class updates status on events.

    // Let's rely on a small delay or polling if needed, but since mock is mostly sync-ish until await,
    // minimal delay should work.
    await flushPromises()

    expect(gen.imagesGenState.status).toBe('running')

    // 2. Export while running
    const rawFiles = gen.export()
    const files = sndFiles(rawFiles)

    // 3. Load from exported state
    const loadedGen = await BackdropGen.load(gen.name, i18n, project, files)

    await flushPromises()
    expect(loadedGen.imagesGenState.status).toBe('running')

    // In loadedGen, depending on how `BackdropGen.load` handles running task:
    // If it sees task as running (which it should if we exported running phase/task),
    // it likely resumes listening (calls `genImages(task)`).

    // Note: The task in `aigcMock` is still technically running (paused at await taskPaused).
    // If `BackdropGen` creates a NEW task instance but with same ID, and subscribes...
    // `MockAigcApis` subscribes to THE SAME entry in `this.tasks`.
    // BUT `subscribeTaskEvents` is a generator. Calling it again creates a NEW generator.
    // Our custom handler will run again for the new subscription?
    // YES. `subscribeTaskEvents` calls `this.taskHandlers.get` again.
    // So the new subscription will ALSO hit the custom handler and pause at `await taskPaused`.

    // This is perfect. Both original and loaded gen are waiting on `taskPaused`.

    // 4. Resume the task
    resolveTask!()

    // 5. Wait for finish
    await genPromise

    // Wait for loadedGen to also finish (it might need a tick)
    await flushPromises()

    // Verify
    expect(gen.imagesGenState.status).toBe('finished')
    expect(gen.imagesGenState.result?.length).toBe(4)

    expect(loadedGen.imagesGenState.status).toBe('finished')
    expect(loadedGen.imagesGenState.result?.length).toBe(4)
    expect(loadedGen.imagesGenState.result?.[0].meta.universalUrl).toBe(
      gen.imagesGenState.result?.[0].meta.universalUrl
    )
  })

  it('should compute remaining time accurately after export/load', async () => {
    vi.useFakeTimers()
    try {
      const baseTime = new Date('2024-01-01T00:00:00Z').getTime()
      vi.setSystemTime(baseTime)

      const project = makeSpxProject()
      const gen = new BackdropGen(i18n, project, {
        settings: { description: 'Remaining time test' }
      })

      await gen.enrich()

      let resumeTask: (() => void) | null = null
      aigcMock.registerTaskHandler(TaskType.GenerateBackdrop, async function* (_task, _params, defaultHandler) {
        await new Promise<void>((r) => {
          resumeTask = r
        })
        yield* defaultHandler()
      })

      gen.genImages()
      await flushPromises()
      expect(gen.imagesGenState.status).toBe('running')

      const rawFiles = gen.export()
      const files = sndFiles(rawFiles)
      // Simulate 5 seconds elapsed since task creation
      vi.setSystemTime(baseTime + 5000)

      const loadedGen = await BackdropGen.load(gen.name, i18n, project, files)
      await flushPromises()

      expect(loadedGen.imagesGenState.status).toBe('running')
      // Task duration for GenerateBackdrop is 15s; 5s elapsed → 10s remaining
      expect(loadedGen.imagesGenState.timeLeft).toBe(10000)

      resumeTask!()
      await flushPromises()
    } finally {
      vi.useRealTimers()
    }
  })

  it('should loadAll from exported files', async () => {
    const project = makeSpxProject()

    const gen1 = new BackdropGen(i18n, project, {
      settings: { description: 'A sunny beach', name: 'Beach' }
    })
    await gen1.enrich()
    await gen1.genImages()
    gen1.setImageIndex(0)

    const gen2 = new BackdropGen(i18n, project, {
      settings: { description: 'A mountain range', name: 'Mountain' }
    })
    await gen2.enrich()

    const allFiles = { ...gen1.export(), ...gen2.export() }
    const files = sndFiles(allFiles)

    const loadedGens = await BackdropGen.loadAll(i18n, makeSpxProject(), files)
    expect(loadedGens.length).toBe(2)

    const loadedNames = loadedGens.map((g) => g.name).sort()
    expect(loadedNames).toEqual(['Beach', 'Mountain'])

    const loadedBeach = loadedGens.find((g) => g.name === 'Beach')!
    expect(loadedBeach.imagesGenState.status).toBe('finished')
    expect(loadedBeach.imagesGenState.result?.length).toBe(4)
    expect(loadedBeach.imageIndex).toBe(0)

    const loadedMountain = loadedGens.find((g) => g.name === 'Mountain')!
    expect(loadedMountain.enrichState.status).toBe('finished')
    expect(loadedMountain.imagesGenState.status).toBe('initial')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArtStyle, BackdropCategory, Perspective } from '@/apis/common'
import { TaskStatus, TaskType } from '@/apis/aigc'
import * as aigcApis from '@/apis/aigc'
import { makeProject } from '../common/test'
import { setupAigcMock, MockAigcApis } from './aigc-mock'
import { BackdropGen } from './backdrop-gen'

setupAigcMock()

const aigcMock = new MockAigcApis()
aigcMock.mock()

describe('BackdropGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeProject()

    // 1. Create BackdropGen with initial description
    const gen = new BackdropGen(project, 'A sunny beach with palm trees and clear blue water')
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
    gen.setImage(gen.imagesGenState.result![2])
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
    const project = makeProject()
    const gen = new BackdropGen(project, 'A beautiful sunset over mountains')

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
    gen.setImage(gen.imagesGenState.result![0])
    const backdrop = await gen.finish()
    expect(backdrop.name).toBe('enriched-backdrop')
  })

  it('should validate backdrop name correctly', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'A scenic landscape')

    await gen.enrich()
    await gen.genImages()
    gen.setImage(gen.imagesGenState.result![0])
    const backdrop1 = await gen.finish()
    project.stage.addBackdrop(backdrop1)

    // Create another gen and try to set duplicate name should fail
    const gen2 = new BackdropGen(project, 'Another landscape')
    await gen2.enrich()
    expect(() => gen2.setName(backdrop1.name)).toThrow()
  })

  it('should throw error when finishing without image', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'A test backdrop')

    await gen.enrich()
    await gen.genImages()

    // Try to finish without setting image
    await expect(gen.finish()).rejects.toThrow('image expected')
  })

  it('should throw error when recording adoption without result', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'A test backdrop')

    await gen.enrich()
    await gen.genImages()

    // Try to record adoption without finishing
    await expect(gen.recordAdoption()).rejects.toThrow('result backdrop expected')
  })

  it('should track isPreparePhase correctly', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'A test backdrop')

    expect(gen.isPreparePhase).toBe(true)

    await gen.enrich()
    await gen.genImages()
    expect(gen.isPreparePhase).toBe(true)

    gen.setImage(gen.imagesGenState.result![0])
    await gen.finish()
    expect(gen.isPreparePhase).toBe(false)
  })

  it('should allow multiple enrichments', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'First description')

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should allow multiple image generations', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'A test backdrop')

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
    const project = makeProject()
    const gen = new BackdropGen(project, 'A test backdrop')
    const tasks = aigcMock.tasks

    const waitForTask = aigcMock.waitForTaskCount(1)
    const genImagesPromise = gen.genImages()
    await waitForTask

    await gen.cancel()
    await expect(genImagesPromise).rejects.toThrow('cancelled')

    const lastRecord = Array.from(tasks.values()).at(-1)
    expect(lastRecord?.task.status).toBe(TaskStatus.Cancelled)
  })

  it('should only include completed task IDs in recordAdoption', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'A test backdrop')

    await gen.enrich()
    await gen.genImages()
    gen.setImage(gen.imagesGenState.result![0])
    await gen.finish()

    // Mock adoptAsset to inspect the taskIds parameter
    const adoptAssetCalls: unknown[] = []
    vi.mocked(aigcApis.adoptAsset).mockImplementation(async (params) => {
      adoptAssetCalls.push(params)
    })

    await gen.recordAdoption()

    // Verify that taskIds contains the task ID (task should be completed)
    expect(adoptAssetCalls).toHaveLength(1)
    const adoptParams = adoptAssetCalls[0] as { taskIds: string[] }
    const tasks = Array.from(aigcMock.tasks.values())
      .filter((record) => record.task.type === TaskType.GenerateBackdrop)
      .map((record) => record.task)
    const task = tasks[tasks.length - 1]!
    expect(adoptParams.taskIds).toHaveLength(1)
    expect(adoptParams.taskIds[0]).toBe(task.id)
  })

  it('should exclude non-completed task IDs from recordAdoption', async () => {
    const project = makeProject()
    const gen = new BackdropGen(project, 'A test backdrop')

    await gen.enrich()
    await gen.genImages()
    gen.setImage(gen.imagesGenState.result![0])
    await gen.finish()

    // Manually modify the task status to simulate a failed task
    const taskRecords = Array.from(aigcMock.tasks.values()).filter(
      (record) => record.task.type === TaskType.GenerateBackdrop
    )
    const taskRecord = taskRecords[taskRecords.length - 1]!
    taskRecord.task.status = TaskStatus.Failed
    taskRecord.task.updatedAt = new Date().toISOString()

    // Mock adoptAsset to inspect the taskIds parameter
    const adoptAssetCalls: unknown[] = []
    vi.mocked(aigcApis.adoptAsset).mockImplementation(async (params) => {
      adoptAssetCalls.push(params)
    })

    await gen.recordAdoption()

    // Verify that taskIds is empty since the task is failed
    expect(adoptAssetCalls).toHaveLength(1)
    const adoptParams = adoptAssetCalls[0] as { taskIds: string[] }
    expect(adoptParams.taskIds).toHaveLength(0)
  })
})

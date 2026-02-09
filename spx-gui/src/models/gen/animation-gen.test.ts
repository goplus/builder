import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnimationLoopMode, ArtStyle, Perspective } from '@/apis/common'
import { TaskStatus, TaskType } from '@/apis/aigc'
import * as fileHelpers from '@/models/common/file'
import { makeProject, mockFile } from '../common/test'
import { setupAigcMock, MockAigcApis } from './aigc-mock'
import { Sprite } from '../sprite'
import { AnimationGen } from './animation-gen'
import { Costume } from '../costume'

setupAigcMock()
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))

const aigcMock = new MockAigcApis()
aigcMock.mock()

describe('AnimationGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)

    // 1. Create AnimationGen with initial settings
    const gen = new AnimationGen(sprite, project, {
      description: 'A walking animation',
      referenceCostumeId: defaultCostume.id
    })
    expect(gen.settings.description).toBe('A walking animation')
    expect(gen.enrichState.status).toBe('initial')
    expect(gen.generateVideoState.status).toBe('initial')

    // 2. User updates description
    gen.setSettings({ description: 'A running animation' })
    expect(gen.settings.description).toBe('A running animation')

    // 3. Enrich settings
    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.enrichState.result?.name).toBe('enriched-animation')
    expect(gen.settings.name).toBe('enriched-animation')

    // 4. User updates some settings
    gen.setSettings({
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.SideScrolling,
      loopMode: AnimationLoopMode.Loopable
    })

    // 5. Generate animation video
    await gen.generateVideo()
    expect(gen.generateVideoState.status).toBe('finished')
    expect(gen.video).not.toBeNull()

    // 6. Configure frames extraction
    gen.setFramesConfig({
      startTime: 0,
      duration: 1000,
      interval: 200
    })
    expect(gen.framesConfig).toEqual({
      startTime: 0,
      duration: 1000,
      interval: 200
    })

    // 7. Extract frames
    await gen.extractFrames()
    expect(gen.extractFramesState.status).toBe('finished')
    expect(gen.extractFramesState.result).not.toBeNull()

    // 8. Finish the animation generation
    const animation = await gen.finish()
    expect(animation.name).toBe('enriched-animation')
  })

  it('should validate animation name correctly', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)

    const gen1 = new AnimationGen(sprite, project, {
      description: 'First animation',
      referenceCostumeId: defaultCostume.id
    })
    await gen1.enrich()
    gen1.setSettings({ name: 'walk' })
    await gen1.generateVideo()
    gen1.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    await gen1.extractFrames()
    const animation1 = await gen1.finish()
    sprite.addAnimation(animation1)

    // Create another gen with duplicate name should fail
    const gen2 = new AnimationGen(sprite, project, {
      description: 'Second animation',
      referenceCostumeId: sprite.costumes[0].id
    })
    await gen2.enrich()
    expect(() => gen2.setName('walk')).toThrow()
  })

  it('should handle errors and retry successfully', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    // First enrich attempt fails
    aigcMock.injectErrorOnce('enrichAnimationSettings', new Error('Network error'))
    await expect(gen.enrich()).rejects.toThrow('Network error')
    expect(gen.enrichState.status).toBe('failed')

    // Retry enrich and succeed
    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')

    // First generate video attempt fails
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Task processing error'))
    await expect(gen.generateVideo()).rejects.toThrow('Task processing error')
    expect(gen.generateVideoState.status).toBe('failed')

    // Retry generate video and succeed
    await gen.generateVideo()
    expect(gen.generateVideoState.status).toBe('finished')
  })

  it('should throw error when generating video without reference costume', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, { description: 'A test animation' })

    await gen.enrich()

    // Try to generate video without reference costume
    await expect(gen.generateVideo()).rejects.toThrow('reference costume expected')
  })

  it('should throw error when extracting frames without video', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })

    // Try to extract frames without generating video
    await expect(gen.extractFrames()).rejects.toThrow('video not ready yet')
  })

  it('should throw error when extracting frames without frames config', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()

    // Try to extract frames without frames config
    await expect(gen.extractFrames()).rejects.toThrow('frames config not set')
  })

  it('should throw error when finishing without frames', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })

    // Try to finish without extracting frames
    await expect(gen.finish()).rejects.toThrow('frame images expected')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'First description',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should allow multiple video generations', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()

    await gen.generateVideo()
    const firstVideo = gen.video
    expect(firstVideo).not.toBeNull()

    gen.setSettings({ artStyle: ArtStyle.FlatDesign })
    await gen.generateVideo()
    const secondVideo = gen.video
    expect(secondVideo).not.toBeNull()
    expect(secondVideo).not.toBe(firstVideo)
  })

  it('should track finish state correctly', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    expect(gen.finishState.status).toBe('initial')
    expect(gen.result).toBeUndefined()

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    await gen.extractFrames()

    const animation = await gen.finish()
    expect(gen.finishState.status).toBe('finished')
    expect(gen.result).toBe(animation)

    // Reset finish state
    gen.resetFinishState()
    expect(gen.finishState.status).toBe('initial')
    expect(gen.result).toBeUndefined()
  })

  it('should cancel running animation tasks', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })
    const tasks = aigcMock.tasks

    const generatePromise = gen.generateVideo()
    await aigcMock.waitForTaskCount(1)
    await gen.cancel()

    await expect(generatePromise).rejects.toThrow('cancelled')
    const lastRecord = Array.from(tasks.values()).at(-1)
    expect(lastRecord?.task.status).toBe(TaskStatus.Cancelled)
  })

  it('should only return completed task IDs in getTaskIds', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    await gen.extractFrames()

    // Both tasks should be completed
    const generateVideoTasks = Array.from(aigcMock.tasks.values())
      .filter((record) => record.task.type === TaskType.GenerateAnimationVideo)
      .map((record) => record.task)
    const extractFramesTasks = Array.from(aigcMock.tasks.values())
      .filter((record) => record.task.type === TaskType.ExtractVideoFrames)
      .map((record) => record.task)
    const taskIds = gen.getTaskIds()
    expect(taskIds).toHaveLength(2)
    expect(taskIds).toContain(generateVideoTasks[generateVideoTasks.length - 1]!.id)
    expect(taskIds).toContain(extractFramesTasks[extractFramesTasks.length - 1]!.id)
  })

  it('should exclude non-completed task IDs from getTaskIds', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    await gen.extractFrames()

    // Manually modify task statuses to simulate failures
    const generateVideoTasks = Array.from(aigcMock.tasks.values()).filter(
      (record) => record.task.type === TaskType.GenerateAnimationVideo
    )
    const extractFramesTasks = Array.from(aigcMock.tasks.values()).filter(
      (record) => record.task.type === TaskType.ExtractVideoFrames
    )
    const generateVideoRecord = generateVideoTasks[generateVideoTasks.length - 1]!
    const extractFramesRecord = extractFramesTasks[extractFramesTasks.length - 1]!
    generateVideoRecord.task.status = TaskStatus.Failed
    generateVideoRecord.task.updatedAt = new Date().toISOString()
    extractFramesRecord.task.status = TaskStatus.Cancelled
    extractFramesRecord.task.updatedAt = new Date().toISOString()

    // getTaskIds should return empty array since both tasks are not completed
    const taskIds = gen.getTaskIds()
    expect(taskIds).toHaveLength(0)
  })

  it('should handle mixed task statuses in getTaskIds', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(sprite, project, {
      description: 'A test animation',
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    await gen.extractFrames()

    // Manually modify one task to fail, keep the other completed
    const generateVideoTasks = Array.from(aigcMock.tasks.values()).filter(
      (record) => record.task.type === TaskType.GenerateAnimationVideo
    )
    const extractFramesTasks = Array.from(aigcMock.tasks.values()).filter(
      (record) => record.task.type === TaskType.ExtractVideoFrames
    )
    const generateVideoRecord = generateVideoTasks[generateVideoTasks.length - 1]!
    const extractFramesRecord = extractFramesTasks[extractFramesTasks.length - 1]!
    generateVideoRecord.task.status = TaskStatus.Failed
    generateVideoRecord.task.updatedAt = new Date().toISOString()

    // getTaskIds should only return the completed extractFramesTask
    const taskIds = gen.getTaskIds()
    expect(taskIds).toHaveLength(1)
    expect(taskIds[0]).toBe(extractFramesRecord.task.id)
  })
})

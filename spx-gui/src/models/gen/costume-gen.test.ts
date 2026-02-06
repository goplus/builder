import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArtStyle, Perspective } from '@/apis/common'
import { Facing, TaskStatus } from '@/apis/aigc'
import * as fileHelpers from '@/models/common/file'
import { makeProject } from '../common/test'
import { setupAigcMock, MockAigcApis } from './aigc-mock'
import { Sprite } from '../sprite'
import { CostumeGen } from './costume-gen'

setupAigcMock()
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))

const aigcMock = new MockAigcApis()
aigcMock.mock()

describe('CostumeGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)

    // 1. Create CostumeGen with initial settings
    const gen = new CostumeGen(sprite, project, {
      description: 'A red cape costume'
    })
    expect(gen.settings.description).toBe('A red cape costume')
    expect(gen.enrichState.status).toBe('initial')
    expect(gen.generateState.status).toBe('initial')

    // 2. User updates description
    gen.setSettings({ description: 'A blue cape costume' })
    expect(gen.settings.description).toBe('A blue cape costume')

    // 3. Enrich settings
    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.enrichState.result?.name).toBe('enriched-costume')
    expect(gen.settings.name).toBe('enriched-costume')

    // 4. User updates some settings
    gen.setSettings({
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.SideScrolling,
      facing: Facing.Right
    })

    // 5. Generate costume image
    await gen.generate()
    expect(gen.generateState.status).toBe('finished')
    expect(gen.image).not.toBeNull()

    // 6. Finish the costume generation
    const costume = await gen.finish()
    expect(costume.name).toBe('enriched-costume')
  })

  it('should handle errors and retry successfully', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'A test costume' })

    // First enrich attempt fails
    aigcMock.injectErrorOnce('enrichCostumeSettings', new Error('Network error'))
    const enrichPromise = gen.enrich()
    await expect(enrichPromise).rejects.toThrow('Network error')
    expect(gen.enrichState.status).toBe('failed')

    // Retry enrich and succeed
    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')

    // First generate attempt fails
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Task processing error'))
    await expect(gen.generate()).rejects.toThrow('Task processing error')
    expect(gen.generateState.status).toBe('failed')

    // Retry generate and succeed
    await gen.generate()
    expect(gen.generateState.status).toBe('finished')
  })

  it('should validate costume name correctly', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)

    const gen1 = new CostumeGen(sprite, project, { description: 'First costume' })
    await gen1.enrich()
    gen1.setSettings({ name: 'costume-1' })
    await gen1.generate()
    const costume1 = await gen1.finish()
    sprite.addCostume(costume1)

    // Create another gen with duplicate name should fail
    const gen2 = new CostumeGen(sprite, project, { description: 'Second costume' })
    await gen2.enrich()
    expect(() => gen2.setName('costume-1')).toThrow()
  })

  it('should throw error when finishing without image', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'A test costume' })

    await gen.enrich()

    // Try to finish without generating image
    await expect(gen.finish()).rejects.toThrow('Costume not generated yet')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'First description' })

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should allow multiple generations', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'A test costume' })

    await gen.enrich()

    await gen.generate()
    const firstImage = gen.image
    expect(firstImage).not.toBeNull()

    gen.setSettings({ artStyle: ArtStyle.FlatDesign })
    await gen.generate()
    const secondImage = gen.image
    expect(secondImage).not.toBeNull()
    expect(secondImage).not.toBe(firstImage)
  })

  it('should track finish state correctly', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'A test costume' })

    expect(gen.finishState.status).toBe('initial')
    expect(gen.result).toBeUndefined()

    await gen.enrich()
    await gen.generate()

    const costume = await gen.finish()
    expect(gen.finishState.status).toBe('finished')
    expect(gen.result).toBe(costume)

    // Reset finish state
    gen.resetFinishState()
    expect(gen.finishState.status).toBe('initial')
    expect(gen.result).toBeUndefined()
  })

  it('should cancel running costume generation', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'A test costume' })
    const tasks = aigcMock.tasks

    const generatePromise = gen.generate()
    await aigcMock.waitForTaskCount(1)
    await gen.cancel()

    await expect(generatePromise).rejects.toThrow('cancelled')
    const lastRecord = Array.from(tasks.values()).at(-1)
    expect(lastRecord?.task.status).toBe(TaskStatus.Cancelled)
  })

  it('should only return completed task IDs in getTaskIds', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'A test costume' })

    await gen.enrich()
    await gen.generate()

    // Task should be completed, so getTaskIds should return it
    const taskIds = gen.getTaskIds()
    expect(taskIds).toHaveLength(1)
    expect(taskIds[0]).toBe(gen.generateTask.data?.id)
  })

  it('should exclude non-completed task IDs from getTaskIds', async () => {
    const project = makeProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { description: 'A test costume' })

    await gen.enrich()
    await gen.generate()

    // Manually modify the task status to simulate a failed task
    if (gen.generateTask.data) {
      gen.generateTask.data.status = TaskStatus.Failed
    }

    // getTaskIds should return empty array since task is failed
    const taskIds = gen.getTaskIds()
    expect(taskIds).toHaveLength(0)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ArtStyle, Perspective } from '@/apis/common'
import { Facing, TaskStatus, TaskType } from '@/apis/aigc'
import * as fileHelpers from '@/models/common/file'
import { sndConfig, sndFiles } from '@/models/common/test'
import { makeSpxProject } from '../common/test'
import { setupAigcMock } from './aigc-mock'
import { Sprite } from '../sprite'
import { CostumeGen } from './costume-gen'

const aigcMock = setupAigcMock()
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))

describe('CostumeGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)

    // 1. Create CostumeGen with initial settings
    const gen = new CostumeGen(sprite, project, {
      settings: { description: 'A red cape costume' }
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
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'A test costume' } })

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
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)

    const gen1 = new CostumeGen(sprite, project, { settings: { description: 'First costume' } })
    await gen1.enrich()
    gen1.setSettings({ name: 'costume-1' })
    await gen1.generate()
    const costume1 = await gen1.finish()
    sprite.addCostume(costume1)

    // Create another gen with duplicate name should fail
    const gen2 = new CostumeGen(sprite, project, { settings: { description: 'Second costume' } })
    await gen2.enrich()
    expect(() => gen2.setName('costume-1')).toThrow()
  })

  it('should throw error when finishing without image', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'A test costume' } })

    await gen.enrich()

    // Try to finish without generating image
    await expect(gen.finish()).rejects.toThrow('Costume not generated yet')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'First description' } })

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should allow multiple generations', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'A test costume' } })

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
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'A test costume' } })

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
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'A test costume' } })
    const tasks = aigcMock.tasks

    const generatePromise = gen.generate()
    await aigcMock.waitForTaskCount(1)
    await gen.cancel()

    await expect(generatePromise).rejects.toThrow('cancelled')
    const lastRecord = Array.from(tasks.values()).at(-1)
    expect(lastRecord?.task.status).toBe(TaskStatus.Cancelled)
  })

  it('should export and load correctly while enrich is running', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'Enrich running costume' } })

    const enrichPromise = gen.enrich()
    expect(gen.enrichState.status).toBe('running')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = CostumeGen.load(sprite, project, config, files)

    // running phase is serialized as initial
    expect(loadedGen.enrichState.status).toBe('initial')
    expect(loadedGen.generateState.status).toBe('initial')
    expect(loadedGen.image).toBeNull()
    expect(loadedGen.finishState.status).toBe('initial')

    await enrichPromise
  })

  it('should export and load correctly after enrich finished but before generation', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'Enrich finished pre-generate costume' } })

    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.generateState.status).toBe('initial')
    expect(gen.image).toBeNull()
    expect(gen.finishState.status).toBe('initial')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = CostumeGen.load(sprite, project, config, files)

    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.enrichState.result).toEqual(gen.enrichState.result)
    expect(loadedGen.generateState.status).toBe('initial')
    expect(loadedGen.image).toBeNull()
    expect(loadedGen.finishState.status).toBe('initial')
  })

  it('should export and load correctly after generate finished but before finish', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'Generated pre-finish costume' } })

    await gen.enrich()
    await gen.generate()

    expect(gen.generateState.status).toBe('finished')
    expect(gen.image).not.toBeNull()
    expect(gen.finishState.status).toBe('initial')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = CostumeGen.load(sprite, project, config, files)

    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.generateState.status).toBe('finished')
    expect(typeof loadedGen.image?.arrayBuffer).toBe('function')
    expect(loadedGen.image?.meta.universalUrl).toBe(gen.image?.meta.universalUrl)
    expect(loadedGen.finishState.status).toBe('initial')
    expect(loadedGen.result).toBeUndefined()
  })

  it('should export and load correctly', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'A test costume export/load' } })

    await gen.enrich()
    await gen.generate()
    await gen.finish()

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]

    const loadedGen = CostumeGen.load(sprite, project, config, files)

    expect(loadedGen.id).toBe(gen.id)
    expect(loadedGen.settings).toEqual(gen.settings)
    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.generateState.status).toBe('finished')
    expect(typeof loadedGen.image?.arrayBuffer).toBe('function')

    expect(loadedGen.finishState.status).toBe('finished')
    expect(loadedGen.result).not.toBeNull()
    expect(loadedGen.result).not.toBe(gen.result)
    expect(loadedGen.result?.id).toBe(gen.result?.id)
    expect(loadedGen.result?.name).toBe(gen.result?.name)
    expect(loadedGen.result?.bitmapResolution).toBe(gen.result?.bitmapResolution)
    expect(typeof loadedGen.result?.img.arrayBuffer).toBe('function')
    expect(loadedGen.result?.img.meta.universalUrl).toBe(gen.result?.img.meta.universalUrl)
  })

  it('should export and load running generate state correctly', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(sprite, project, { settings: { description: 'Running test costume' } })

    let resolveTask: (() => void) | null = null
    const taskPaused = new Promise<void>((r) => {
      resolveTask = r
    })

    aigcMock.registerTaskHandler(TaskType.GenerateCostume, async function* (_task, _params, defaultHandler) {
      await taskPaused
      yield* defaultHandler()
    })

    const generatePromise = gen.generate()
    await flushPromises()
    expect(gen.generateState.status).toBe('running')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = CostumeGen.load(sprite, project, config, files)

    await flushPromises()
    expect(loadedGen.generateState.status).toBe('running')

    resolveTask!()
    await generatePromise
    await flushPromises()

    expect(gen.generateState.status).toBe('finished')
    expect(loadedGen.generateState.status).toBe('finished')
    expect(typeof loadedGen.image?.arrayBuffer).toBe('function')
    expect(loadedGen.image?.meta.universalUrl).toBe(gen.image?.meta.universalUrl)
  })
})

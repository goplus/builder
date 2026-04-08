import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { AnimationLoopMode, ArtStyle, Perspective } from '@/apis/common'
import { setupAigcMock } from './aigc-mock' // Put me before importing `@/apis/aigc` to ensure the mock is set up correctly
import { TaskStatus, TaskType } from '@/apis/aigc'
import * as fileHelpers from '@/models/common/file'
import { makeSpxProject } from '../common/test'
import { mockFile, sndConfig, sndFiles } from '../../common/test'
import { Sprite } from '../sprite'
import { createI18n } from '@/utils/i18n'
import { AnimationGen } from './animation-gen'
import { Costume } from '../costume'

const aigcMock = setupAigcMock()
const i18n = createI18n({ lang: 'en' })
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))

describe('AnimationGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)

    // 1. Create AnimationGen with initial settings
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A walking animation' },
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

    // 7. Extract frames and save animation
    const animation = await gen.finish()
    expect(gen.finishState.status).toBe('finished')
    expect(gen.finishState.result).not.toBeNull()
    expect(animation.name).toBe('enriched-animation')
  })

  it('should validate animation name correctly', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)

    const gen1 = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'First animation' },
      referenceCostumeId: defaultCostume.id
    })
    await gen1.enrich()
    gen1.setSettings({ name: 'walk' })
    await gen1.generateVideo()
    gen1.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    const animation1 = await gen1.finish()
    sprite.addAnimation(animation1)

    // Create another gen with duplicate name should fail
    const gen2 = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'Second animation' },
      referenceCostumeId: sprite.costumes[0].id
    })
    await gen2.enrich()
    expect(() => gen2.setName('walk')).toThrow()
  })

  it('should handle errors and retry successfully', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A test animation' },
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
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, { settings: { description: 'A test animation' } })

    await gen.enrich()

    // Try to generate video without reference costume
    await expect(gen.generateVideo()).rejects.toThrow('reference image expected')
  })

  it('should throw error when extracting frames without video', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A test animation' },
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })

    // Try to extract frames without generating video
    await expect(gen.finish()).rejects.toThrow('video not ready yet')
  })

  it('should throw error when extracting frames without frames config', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A test animation' },
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()

    // Try to extract frames without frames config
    await expect(gen.finish()).rejects.toThrow('frames config not set')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'First description' },
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should forward ui language to enrich api', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(createI18n({ lang: 'zh' }), sprite, project, {
      settings: { description: 'A test animation' },
      referenceCostumeId: defaultCostume.id
    })
    await gen.enrich()
    expect(vi.mocked(aigcMock.enrichAnimationSettings).mock.calls.at(-1)?.[4]).toBe('zh')
  })

  it('should allow multiple video generations', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A test animation' },
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
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A test animation' },
      referenceCostumeId: defaultCostume.id
    })

    expect(gen.finishState.status).toBe('initial')
    expect(gen.result).toBeUndefined()

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })

    const animation = await gen.finish()
    expect(gen.finishState.status).toBe('finished')
    expect(gen.result).toBe(animation)

    // Reset finish state
    gen.resetFinishState()
    expect(gen.finishState.status).toBe('initial')
    expect(gen.result).toBeUndefined()
  })

  it('should cancel running animation tasks', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A test animation' },
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

  it('should export and load correctly while enrich is running', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'Enrich running animation' },
      referenceCostumeId: defaultCostume.id
    })

    const enrichPromise = gen.enrich()
    expect(gen.enrichState.status).toBe('running')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = AnimationGen.load(i18n, sprite, project, config, files)

    expect(loadedGen.enrichState.status).toBe('initial')
    expect(loadedGen.generateVideoState.status).toBe('initial')
    expect(loadedGen.finishState.status).toBe('initial')
    expect(loadedGen.video).toBeNull()

    await enrichPromise
  })

  it('should export and load correctly after generateVideo finished but before finish', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'Generated video pre-extract animation' },
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = AnimationGen.load(i18n, sprite, project, config, files)

    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.generateVideoState.status).toBe('finished')
    expect(typeof loadedGen.video?.arrayBuffer).toBe('function')
    expect(loadedGen.video?.meta.universalUrl).toBe(gen.video?.meta.universalUrl)
    expect(loadedGen.finishState.status).toBe('initial')
  })

  it('should export and load correctly after finish completed', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'Extracted pre-finish animation' },
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    await gen.finish()

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = AnimationGen.load(i18n, sprite, project, config, files)

    expect(loadedGen.generateVideoState.status).toBe('finished')
    expect(loadedGen.finishState.status).toBe('finished')
    expect(loadedGen.result).not.toBeNull()
    expect(loadedGen.result?.name).toBe(gen.result?.name)
  })

  it('should export and load correctly', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'A test animation export/load' },
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })
    await gen.finish()

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = AnimationGen.load(i18n, sprite, project, config, files)

    expect(loadedGen.id).toBe(gen.id)
    expect(loadedGen.settings).toEqual(gen.settings)
    expect(loadedGen.enrichState.status).toBe('finished')
    expect(loadedGen.generateVideoState.status).toBe('finished')
    expect(loadedGen.finishState.status).toBe('finished')
    expect(loadedGen.result).not.toBeNull()
    expect(loadedGen.result).not.toBe(gen.result)
    expect(loadedGen.result?.id).toBe(gen.result?.id)
    expect(loadedGen.result?.name).toBe(gen.result?.name)
    expect(loadedGen.result?.costumes.length).toBe(gen.result?.costumes.length)
  })

  it('should export and load running generateVideo state correctly', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'Running video animation' },
      referenceCostumeId: defaultCostume.id
    })

    let resolveTask: (() => void) | null = null
    const taskPaused = new Promise<void>((r) => {
      resolveTask = r
    })

    aigcMock.registerTaskHandler(TaskType.GenerateAnimationVideo, async function* (_task, _params, defaultHandler) {
      await taskPaused
      yield* defaultHandler()
    })

    const generatePromise = gen.generateVideo()
    await flushPromises()
    expect(gen.generateVideoState.status).toBe('running')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = AnimationGen.load(i18n, sprite, project, config, files)

    await flushPromises()
    expect(loadedGen.generateVideoState.status).toBe('running')

    resolveTask!()
    await generatePromise
    await flushPromises()

    expect(gen.generateVideoState.status).toBe('finished')
    expect(loadedGen.generateVideoState.status).toBe('finished')
    expect(loadedGen.video?.meta.universalUrl).toBe(gen.video?.meta.universalUrl)
  })

  it('should export and load running finish state correctly', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile())
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { description: 'Running extract animation' },
      referenceCostumeId: defaultCostume.id
    })

    await gen.enrich()
    await gen.generateVideo()
    gen.setFramesConfig({ startTime: 0, duration: 1000, interval: 200 })

    let resolveTask: (() => void) | null = null
    const taskPaused = new Promise<void>((r) => {
      resolveTask = r
    })

    aigcMock.registerTaskHandler(TaskType.ExtractVideoFrames, async function* (_task, _params, defaultHandler) {
      await taskPaused
      yield* defaultHandler()
    })

    const finishPromise = gen.finish()
    await flushPromises()
    expect(gen.finishState.status).toBe('running')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = AnimationGen.load(i18n, sprite, project, config, files)

    await flushPromises()
    expect(loadedGen.finishState.status).toBe('running')

    resolveTask!()
    await finishPromise

    expect(gen.finishState.status).toBe('finished')
    expect(loadedGen.finishState.status).toBe('finished')
    expect(loadedGen.finishState.result?.name).toBe(gen.finishState.result?.name)
    expect(loadedGen.finishState.result?.costumes.length).toBe(gen.finishState.result?.costumes.length)
  })
})

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
import { mockSaveFile } from './test-helpers'
import { Animation, AnimationSoundPlayback } from '../animation'
import { Phase } from './common'
import {
  createAnimationReferenceVideo,
  getAnimationReferenceLayout,
  prepareAnimationReferenceVideo
} from './animation-reference-video'

vi.mock('./animation-reference-video', () => ({
  createAnimationReferenceVideo: vi.fn(),
  prepareAnimationReferenceVideo: vi.fn(),
  getAnimationReferenceLayout: vi.fn()
}))

const aigcMock = setupAigcMock()
const i18n = createI18n({ lang: 'en' })
vi.spyOn(fileHelpers, 'getImageSize')

describe('AnimationGen', () => {
  beforeEach(() => {
    aigcMock.reset()
    vi.mocked(fileHelpers.getImageSize).mockResolvedValue({ width: 512, height: 512 })
    mockSaveFile()
    vi.mocked(createAnimationReferenceVideo).mockReset().mockResolvedValue(mockFile('reference.mp4'))
    vi.mocked(prepareAnimationReferenceVideo)
      .mockReset()
      .mockImplementation(async (video) => video)
    vi.mocked(getAnimationReferenceLayout).mockResolvedValue({
      size: 768,
      scale: 3,
      origin: { x: 240, y: 600 }
    })
  })

  it('rejects an unsupported reference without replacing the selection', () => {
    const gen = new AnimationGen(i18n, Sprite.create('TestSprite', ''), makeSpxProject())
    gen.setReferenceImageSelection({ type: 'local-image', file: mockFile('reference.png') })
    const selection = gen.referenceImageSelection
    const file = mockFile('reference.svg')

    expect(() => gen.setReferenceImageSelection({ type: 'local-image', file })).toThrow(
      'unsupported reference image type'
    )
    expect(gen.referenceImageSelection).toBe(selection)
    gen.dispose()
  })

  it('encodes an animation name when using it as a directory', () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: 'a/b' },
      video: mockFile('video.mp4')
    })

    const [, files] = gen.export('gen/assets/sprites/TestSprite')
    expect(Object.keys(files)).toContain('gen/assets/sprites/TestSprite/animations/a%2Fb/video.mp4')
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
      duration: 1100,
      interval: 200
    })
    expect(gen.framesConfig).toEqual({
      startTime: 0,
      duration: 1100,
      interval: 200
    })

    // 7. Extract frames and save animation
    const animation = await gen.finish()
    expect(gen.finishState.status).toBe('finished')
    expect(gen.finishState.result).not.toBeNull()
    expect(animation.name).toBe('enriched-animation')
    expect(animation.costumes).toHaveLength(5)
    expect(animation.duration).toBe(1.1)
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

  it('should throw error when generating video without a reference image or costume', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new AnimationGen(i18n, sprite, project, { settings: { description: 'A test animation' } })

    await gen.enrich()

    // Try to generate video without a reference image or costume
    await expect(gen.generateVideo()).rejects.toThrow('reference image or costume expected')
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
    expect(gen.result).toBe(animation)
  })

  it('edits a saved animation using its frames and keeps the old result until extraction succeeds', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = Animation.create('walk', [new Costume('frame', mockFile('frame.png'))], {
      duration: 1,
      sound: project.sounds[0].id,
      soundPlayback: AnimationSoundPlayback.Loop
    })
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: source.name },
      finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result: source })
    })
    const editing = gen.editVideo('  Make the hat blue  ')
    expect(gen.result).toBe(source)
    await editing
    expect(createAnimationReferenceVideo).toHaveBeenCalledWith(
      expect.objectContaining({ id: source.id }),
      expect.any(AbortSignal)
    )
    expect([...aigcMock.tasks.values()][0].params).toMatchObject({
      settings: { referenceVideoUrl: 'kodo://mock-bucket/reference.mp4', referenceFrameUrl: null },
      editInstruction: 'Make the hat blue'
    })
    expect(gen.result).toBe(source)
    expect(gen.hasPendingVideo).toBe(true)
    gen.setFramesConfig({ duration: 1000, interval: 200 })

    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Extraction failed'))
    await expect(gen.finish()).rejects.toThrow('Extraction failed')
    expect(gen.result).toBe(source)
    expect(gen.hasPendingVideo).toBe(true)
    gen.resetFinishState()
    expect(gen.result).toBe(source)

    const result = await gen.finish()
    expect(result.id).toBe(source.id)
    expect(result.sound).toBe(source.sound)
    expect(result.soundPlayback).toBe(source.soundPlayback)
    expect(result.costumes[0].bitmapResolution).toBe(2)
    expect(result.costumes[0].pivot).toEqual({ x: 80, y: 200 })
    expect(result.costumes[0].img).not.toBe(source.costumes[0].img)
    expect(gen.hasPendingVideo).toBe(false)
    expect(gen.result).toBe(result)
    const [config, files] = gen.export()
    const restored = AnimationGen.load(i18n, sprite, project, config, sndFiles(files))
    expect(restored.hasPendingVideo).toBe(false)
    expect(restored.result?.id).toBe(source.id)
    await restored.editVideo('Make the coat red')
    expect(createAnimationReferenceVideo).toHaveBeenCalledTimes(1)
    expect([...aigcMock.tasks.values()].at(-1)!.params).toMatchObject({
      settings: { referenceVideoUrl: `kodo://mock-bucket/${gen.video!.name}`, referenceFrameUrl: null },
      editInstruction: 'Make the coat red'
    })
    restored.setFramesConfig({ duration: 800, interval: 200 })
    await restored.finish()
    const layoutSource = vi.mocked(getAnimationReferenceLayout).mock.calls.at(-1)![0]
    expect(layoutSource.costumes.map((costume) => costume.id)).toEqual(source.costumes.map((costume) => costume.id))
    expect(restored.result?.sound).toBe(source.sound)
    gen.dispose()
    restored.dispose()
    project.dispose()
  })

  it('uses the default generation duration and saves the full video instead of pre-cropping it', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = Animation.create(
      'walk',
      Array.from({ length: 4 }, (_, i) => new Costume(`frame${i}`, mockFile('frame.png'))),
      { duration: 0.8 }
    )
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: source.name },
      finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result: source })
    })
    await gen.editVideo('Make the hat blue')
    expect(gen.framesConfig).toBeNull()
    expect([...aigcMock.tasks.values()][0].params).not.toHaveProperty('duration')
    gen.setFramesConfig({
      startTime: 0,
      duration: 5000,
      interval: 100
    })
    const result = await gen.finish()
    expect([...aigcMock.tasks.values()][1].params).toMatchObject({
      duration: 5000,
      interval: 100
    })
    expect(result.duration).toBe(5)
    expect(result.costumes).toHaveLength(50)
    const [config, files] = gen.export()
    const restored = AnimationGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    expect(restored.result?.duration).toBe(5)
    expect(restored.result?.costumes).toHaveLength(50)
    gen.dispose()
    restored.dispose()
    project.dispose()
  })

  it('edits an unsaved video directly without extracting or encoding frames', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const video = mockFile('unsaved.mp4')
    const gen = new AnimationGen(i18n, sprite, project, { video })

    await gen.editVideo('Make the hat blue')

    expect([...aigcMock.tasks.values()].map(({ task }) => task.type)).toEqual([TaskType.GenerateAnimationVideo])
    expect([...aigcMock.tasks.values()][0].params).toMatchObject({
      settings: { referenceVideoUrl: 'kodo://mock-bucket/unsaved.mp4', referenceFrameUrl: null },
      editInstruction: 'Make the hat blue'
    })
    expect(createAnimationReferenceVideo).not.toHaveBeenCalled()
    expect(gen.result).toBeUndefined()
    expect(gen.finishState.status).toBe('initial')
    expect(gen.hasPendingVideo).toBe(true)
    expect(gen.framesConfig).toBeNull()
    gen.dispose()
    project.dispose()
  })

  it('uses the selected video segment for another edit before adopting it', async () => {
    const project = makeSpxProject()
    const video = mockFile('unsaved.mp4')
    const range = { startTime: 1000, duration: 800, interval: 100 }
    const gen = new AnimationGen(i18n, project.sprites[0], project, { video, framesConfig: range })
    vi.mocked(prepareAnimationReferenceVideo).mockResolvedValue(mockFile('selected-reference.mp4'))

    await gen.editVideo('Make the hat blue')

    expect(prepareAnimationReferenceVideo).toHaveBeenCalledWith(video, range, expect.any(AbortSignal))
    expect([...aigcMock.tasks.values()].map(({ task }) => task.type)).toEqual([TaskType.GenerateAnimationVideo])
    expect([...aigcMock.tasks.values()][0].params).toMatchObject({
      settings: { referenceVideoUrl: 'kodo://mock-bucket/selected-reference.mp4' }
    })
    expect(gen.result).toBeUndefined()
    gen.dispose()
    project.dispose()
  })

  it('retains the current video and source when editing fails', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.animations[0]
    const video = mockFile('candidate.mp4')
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: source.name },
      video,
      hasPendingVideo: true,
      framesConfig: { duration: 1000, interval: 200 },
      finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result: source })
    })
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Generation failed'))
    await expect(gen.editVideo('Change the hat')).rejects.toThrow('Generation failed')
    expect(gen.result).toBe(source)
    expect(sprite.animations[0]).toBe(source)
    expect(gen.video).toBe(video)
    expect(gen.framesConfig?.duration).toBe(1000)
    expect(gen.hasPendingVideo).toBe(true)
    expect([...aigcMock.tasks.values()].map(({ task }) => task.type)).toEqual([TaskType.GenerateAnimationVideo])
    await expect(gen.editVideo(' \n ')).rejects.toThrow('Edit instruction expected')
    expect(createAnimationReferenceVideo).not.toHaveBeenCalled()
    gen.dispose()
    project.dispose()
  })

  it('restores a completed video without pre-cropping it to the original animation duration', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.animations[0]
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: source.name },
      finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result: source })
    })
    await gen.editVideo('Change the hat')
    const [config, files] = gen.export()
    config.generateVideoPhaseSerialized!.state = { status: 'initial' }
    delete config.videoPath
    delete config.framesConfig
    const restored = AnimationGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    await flushPromises()
    expect(restored.generateVideoState.status).toBe('finished')
    expect(restored.hasPendingVideo).toBe(true)
    expect(restored.framesConfig).toBeNull()
    expect(aigcMock.tasks.size).toBe(1)
    gen.dispose()
    restored.dispose()
    project.dispose()
  })

  it('restores completed extraction while the edited frames are still being created', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.animations[0]
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: source.name },
      video: mockFile('edited.mp4'),
      hasPendingVideo: true,
      framesConfig: { duration: 1000, interval: 200 },
      finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result: source })
    })
    const layout = { size: 768, scale: 3, origin: { x: 240, y: 600 } }
    let resolveLayout: ((value: typeof layout) => void) | null = null
    const pendingLayout = new Promise<typeof layout>((resolve) => {
      resolveLayout = resolve
    })
    vi.mocked(getAnimationReferenceLayout).mockReturnValueOnce(pendingLayout)

    const finishing = gen.finish()
    await flushPromises()
    expect(gen.finishState.status).toBe('running')
    expect(gen.result).toBe(source)
    expect(getAnimationReferenceLayout).toHaveBeenCalledTimes(1)
    expect(aigcMock.tasks.size).toBe(1)
    const [config, files] = gen.export()
    expect(config.extractFramesTaskSerialized?.data?.status).toBe(TaskStatus.Completed)

    const restored = AnimationGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    await flushPromises()

    expect(restored.finishState.status).toBe('finished')
    expect(restored.hasPendingVideo).toBe(false)
    expect(restored.result?.id).toBe(source.id)
    expect(restored.result?.costumes).toHaveLength(5)
    expect(restored.result?.costumes[0].img.meta.universalUrl).toBe('kodo://mock-bucket/frame-1.webp')
    expect(aigcMock.tasks.size).toBe(1)
    expect(aigcMock.createTask).toHaveBeenCalledTimes(1)

    resolveLayout!(layout)
    await finishing
    gen.dispose()
    restored.dispose()
    project.dispose()
  })

  it('does not restore extraction from the previous video after generating another edit', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.animations[0]
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: source.name },
      video: mockFile('first-edit.mp4'),
      hasPendingVideo: true,
      framesConfig: { duration: 1000, interval: 200 },
      finishPhase: new Phase({ en: 'save animation', zh: '保存动画' }, { status: 'finished', result: source })
    })
    const saved = await gen.finish()
    await gen.editVideo('Make the hat blue')
    gen.setFramesConfig({ duration: 2000, interval: 200 })
    vi.mocked(getAnimationReferenceLayout).mockClear()
    const [config, files] = gen.export()

    const restored = AnimationGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    await flushPromises()

    expect(restored.hasPendingVideo).toBe(true)
    expect(restored.video?.meta.universalUrl).toBe(gen.video?.meta.universalUrl)
    expect(restored.result?.id).toBe(saved.id)
    expect(restored.result?.duration).toBe(saved.duration)
    expect(restored.framesConfig?.duration).toBe(2000)
    expect(getAnimationReferenceLayout).not.toHaveBeenCalled()
    expect(aigcMock.tasks.size).toBe(2)
    gen.dispose()
    restored.dispose()
    project.dispose()
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
    expect(loadedGen.finishState.result?.duration).toBe(1)
  })

  it('uses a local image directly as the animation reference', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const costume = new Costume('default', mockFile('default.png'))
    sprite.addCostume(costume)
    const gen = new AnimationGen(i18n, sprite, project, { settings: { name: 'walk' } })
    const localFile = mockFile('local_character.png')
    gen.setReferenceImageSelection({ type: 'local-image', file: localFile })
    gen.setReferenceCostume(costume.id)
    gen.setReferenceImageSelection({ type: 'local-image', file: localFile })

    await gen.generateVideo()
    const [videoTask] = [...aigcMock.tasks.values()]
    expect(aigcMock.tasks.size).toBe(1)
    expect(videoTask.task.type).toBe(TaskType.GenerateAnimationVideo)
    expect(videoTask.params).toMatchObject({
      settings: { referenceFrameUrl: 'kodo://mock-bucket/local_character.png' }
    })
    expect(gen.getTaskIds()).toEqual([videoTask.task.id])

    const [rawConfig, rawFiles] = gen.export()
    const loaded = AnimationGen.load(i18n, sprite, project, sndConfig(rawConfig), sndFiles(rawFiles))
    expect(loaded.referenceImageSelection).toMatchObject({ type: 'local-image', file: { name: localFile.name } })
    expect(loaded.getTaskIds()).toEqual([videoTask.task.id])
    gen.dispose()
    loaded.dispose()
  })

  it.each([
    [148, 148],
    [255, 512],
    [512, 255],
    [5761, 512],
    [512, 5761]
  ])('rejects a %i×%i reference before uploading or starting a video task', async (width, height) => {
    vi.mocked(fileHelpers.getImageSize).mockResolvedValue({ width, height })
    const saveFile = mockSaveFile()
    saveFile.mockClear()
    const gen = new AnimationGen(i18n, Sprite.create('TestSprite', ''), makeSpxProject(), {
      referenceImageSelection: { type: 'local-image', file: mockFile('reference.png') }
    })

    await expect(gen.generateVideo()).rejects.toThrow('256')
    expect(saveFile).not.toHaveBeenCalled()
    expect(aigcMock.tasks.size).toBe(0)
    expect(gen.generateVideoState.status).toBe('failed')
    gen.dispose()
  })

  it.each([
    [256, 256],
    [5760, 256],
    [256, 5760]
  ])('accepts a %i×%i video reference at the dimension limits', async (width, height) => {
    vi.mocked(fileHelpers.getImageSize).mockResolvedValue({ width, height })
    const gen = new AnimationGen(i18n, Sprite.create('TestSprite', ''), makeSpxProject(), {
      referenceImageSelection: { type: 'local-image', file: mockFile('reference.png') }
    })

    await gen.generateVideo()
    expect(aigcMock.tasks.size).toBe(1)
    gen.dispose()
  })

  it.each(['replace', 'remove', 'select costume'] as const)(
    'invalidates a running video task when the reference is %s',
    async (change) => {
      let resume!: () => void
      const paused = new Promise<void>((resolve) => {
        resume = resolve
      })
      aigcMock.registerTaskHandler(TaskType.GenerateAnimationVideo, async function* (_task, _params, defaultHandler) {
        await paused
        yield* defaultHandler()
      })
      const project = makeSpxProject()
      const sprite = Sprite.create('TestSprite', '')
      const costume = new Costume('default', mockFile('default.png'))
      sprite.addCostume(costume)
      const gen = new AnimationGen(i18n, sprite, project, {
        settings: { name: 'walk' },
        referenceImageSelection: { type: 'local-image', file: mockFile('reference.png') }
      })
      const pending = gen.generateVideo().catch((error) => error)
      await vi.waitFor(() => expect(aigcMock.tasks.size).toBe(1))
      if (change === 'select costume') gen.setReferenceCostume(costume.id)
      else
        gen.setReferenceImageSelection(
          change === 'remove'
            ? { type: 'costume', costumeId: costume.id }
            : { type: 'local-image', file: mockFile('replacement.png') }
        )
      const [config, files] = gen.export()
      expect(config.generateVideoTaskSerialized).toBeUndefined()
      const loaded = AnimationGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
      resume()
      expect(await pending).toBeInstanceOf(Error)
      expect(gen.video).toBeNull()
      expect([...aigcMock.tasks.values()][0].task.status).toBe(TaskStatus.Cancelled)
      expect(loaded.generateVideoState.status).toBe('initial')
      await gen.generateVideo()
      const videoTask = [...aigcMock.tasks.values()].at(-1)!
      expect(videoTask.params).toMatchObject({
        settings: {
          referenceFrameUrl:
            change === 'replace' ? 'kodo://mock-bucket/replacement.png' : 'kodo://mock-bucket/default.png'
        }
      })
      gen.dispose()
      loaded.dispose()
    }
  )

  it('does not start video generation after the reference changes during upload', async () => {
    let resume!: () => void
    const paused = new Promise<void>((resolve) => {
      resume = resolve
    })
    mockSaveFile().mockImplementationOnce(async () => {
      await paused
      return 'kodo://mock-bucket/reference.png'
    })
    const gen = new AnimationGen(i18n, Sprite.create('TestSprite', ''), makeSpxProject(), {
      referenceImageSelection: { type: 'local-image', file: mockFile('reference.png') }
    })
    const pending = gen.generateVideo().catch((error) => error)
    await flushPromises()
    gen.setReferenceImageSelection({ type: 'local-image', file: mockFile('replacement.png') })
    resume()
    expect(await pending).toBeInstanceOf(Error)
    expect(aigcMock.tasks.size).toBe(0)
    gen.dispose()
  })

  it('loads generated video when the reference file is missing', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: 'walk' },
      referenceImageSelection: { type: 'local-image', file: mockFile('reference.png') }
    })
    await gen.generateVideo()
    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    if (config.reference?.type !== 'local-image') throw new Error('local reference expected')
    delete files[config.reference.filePath]
    const loaded = AnimationGen.load(i18n, sprite, project, config, files)
    expect(loaded.referenceImageSelection).toBeNull()
    expect(loaded.video?.meta.universalUrl).toBe(gen.video?.meta.universalUrl)
    expect(loaded.getTaskIds()).toEqual(gen.getTaskIds())
    gen.dispose()
    loaded.dispose()
  })
  it('exports and loads the reference file through the stored selection', () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const file = mockFile('reference.png')
    const gen = new AnimationGen(i18n, sprite, project, {
      settings: { name: 'reference-test' },
      referenceImageSelection: { type: 'local-image', file }
    })
    const [config, files] = gen.export()
    expect(config.reference).toEqual({ type: 'local-image', filePath: expect.any(String) })
    expect(config).not.toHaveProperty('referenceImagePath')
    if (config.reference?.type !== 'local-image') throw new Error('local reference expected')
    expect(files[config.reference.filePath]).toBe(file)

    const loaded = AnimationGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    expect(loaded.referenceImageSelection).toMatchObject({ type: 'local-image', file: { name: file.name } })
    const [saved] = loaded.export()
    expect(saved.reference).toEqual(config.reference)
    gen.dispose()
    loaded.dispose()
    project.dispose()
  })
})

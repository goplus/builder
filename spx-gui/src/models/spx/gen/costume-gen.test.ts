import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ArtStyle, Perspective } from '@/apis/common'
import { setupAigcMock } from './aigc-mock' // Put me before importing `@/apis/aigc` to ensure the mock is set up correctly
import { Facing, TaskStatus, TaskType } from '@/apis/aigc'
import * as fileHelpers from '@/models/common/file'
import { mockFile, sndConfig, sndFiles } from '@/models/common/test'
import { makeSpxProject } from '../common/test'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import { createI18n } from '@/utils/i18n'
import { CostumeGen } from './costume-gen'
import { Phase } from './common'
import { mockSaveFile } from './test-helpers'

const aigcMock = setupAigcMock()
const i18n = createI18n({ lang: 'en' })
// TODO: Consider replacing this spy by pre-filling file.meta.imgSize in test fixtures.
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))

describe('CostumeGen', () => {
  beforeEach(() => {
    aigcMock.reset()
    mockSaveFile()
  })

  it('edits the saved costume with a separate instruction and retains it on failure', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.costumes[0]
    source.setImg(mockFile('current.png'))
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: source.name, description: 'Original costume description' },
      image: source.img,
      referenceImageSelection: { type: 'local-image', file: mockFile('unrelated.png') },
      finishPhase: new Phase({ en: 'save costume', zh: '保存造型' }, { status: 'finished', result: source.clone(true) })
    })
    const saved = gen.result
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Edit unavailable'))
    await expect(gen.edit('Make the hat blue')).rejects.toThrow('Edit unavailable')
    expect(gen.result).toBe(saved)
    expect(gen.image).toBe(source.img)

    await gen.edit('Make the hat blue')
    expect([...aigcMock.tasks.values()].at(-1)?.params).toMatchObject({
      settings: { description: 'Original costume description', referenceImageUrl: 'kodo://mock-bucket/current.png' },
      editInstruction: 'Make the hat blue',
      n: 1
    })
    expect(gen.settings.description).toBe('Original costume description')
    expect(gen.result).toBe(saved)
    expect(gen.image).not.toBe(source.img)
    const result = await gen.finish()
    expect(result.id).toBe(source.id)
    expect(result.img).toBe(gen.image)
    gen.dispose()
    project.dispose()
  })

  it('requires a saved costume and a nonempty instruction for editing', async () => {
    const project = makeSpxProject()
    const gen = new CostumeGen(i18n, project.sprites[0], project)
    await expect(gen.edit('Make it blue')).rejects.toThrow('Saved costume expected')
    gen.setImage(mockFile('saved.png'))
    await gen.finish()
    await expect(gen.edit('   ')).rejects.toThrow('Edit instruction expected')
    expect(aigcMock.tasks.size).toBe(0)
    gen.dispose()
    project.dispose()
  })

  it('persists point comments, submits them without a global instruction, and retains them on failure', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.costumes[0]
    const comments = [{ id: 'point', x: 0.6, y: 0.4, content: 'Make this white' }]
    const originalImage = source.img
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: source.name },
      image: mockFile('visible-candidate.png'),
      finishPhase: new Phase({ en: 'save', zh: '保存' }, { status: 'finished', result: source }),
      editComments: comments
    })
    const [config, files] = gen.export()
    const loaded = CostumeGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    onTestFinished(() => {
      loaded.dispose()
      gen.dispose()
      project.dispose()
    })
    expect(loaded.editComments).toEqual(comments)
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Edit unavailable'))
    await expect(loaded.edit('')).rejects.toThrow('Edit unavailable')
    expect(loaded.editComments).toEqual(comments)
    await loaded.edit('')
    expect([...aigcMock.tasks.values()].at(-1)?.params).toMatchObject({
      settings: { referenceImageUrl: 'kodo://mock-bucket/visible-candidate.png' },
      editInstruction: expect.stringContaining('At (599, 400): Make this white')
    })
    expect(loaded.editComments).toEqual([])
    expect(source.img).toBe(originalImage)
  })

  it('keeps the original bounds when editing generated costumes again after reload', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const gen = new CostumeGen(i18n, sprite, project, { settings: { name: 'new-costume' } })
    const getImageSize = vi.mocked(fileHelpers.getImageSize)
    getImageSize.mockImplementation(async (file) => file.meta.imgSize ?? { width: 100, height: 100 })
    onTestFinished(() => {
      gen.dispose()
      project.dispose()
      getImageSize.mockResolvedValue({ width: 100, height: 100 })
    })
    await gen.generate()
    const original = await gen.finish()
    await gen.edit('A blue hat')
    gen.image!.meta.imgSize = { width: 400, height: 200 }
    const candidate = await gen.finish()
    expect(await candidate.getSize()).toEqual({ width: 50, height: 25 })

    const [config, files] = gen.export()
    const restored = CostumeGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    onTestFinished(() => restored.dispose())
    await flushPromises()
    await restored.edit('A red coat')
    restored.image!.meta.imgSize = { width: 200, height: 400 }
    const result = await restored.finish()
    expect([...aigcMock.tasks.values()].at(-1)!.params).toMatchObject({
      settings: { referenceImageUrl: `kodo://mock-bucket/${candidate.img.name}` },
      editInstruction: 'A red coat'
    })
    expect(result.id).toBe(original.id)
    expect(await result.getSize()).toEqual({ width: 25, height: 50 })
    expect(result.pivot).toEqual({ x: 12.5, y: 25 })
  })

  it('preserves a regenerated costume identity, bounds, pivot and facing after export/load', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.costumes[0]
    source.setBitmapResolution(2)
    source.setPivot({ x: 12, y: 39 })
    source.setFaceRight(-90)
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: source.name },
      referenceCostumeId: source.id,
      finishPhase: new Phase(
        { en: 'Save costume', zh: '保存造型' },
        { status: 'finished', result: source.clone(true) }
      ),
      image: mockFile('generated.png')
    })
    const [config, files] = gen.export()
    const loaded = CostumeGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    vi.spyOn(loaded.result!, 'getSize').mockResolvedValueOnce({ width: 50, height: 50 })
    vi.mocked(fileHelpers.getImageSize).mockResolvedValueOnce({ width: 400, height: 200 })
    const result = await loaded.finish()

    expect(result.bitmapResolution).toBe(8)
    expect(result.pivot).toEqual({ x: 12, y: 19.5 })
    expect(result.faceRight).toBe(-90)
    expect(result.id).toBe(source.id)
    expect(source.pivot).toEqual({ x: 12, y: 39 })
    expect(source.bitmapResolution).toBe(2)
    gen.dispose()
    loaded.dispose()
    project.dispose()
  })

  it('retains the saved result and description when regeneration fails, then retries with it as reference', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.costumes[0]
    source.setImg(mockFile('original.png'))
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: source.name, description: 'Make the hat blue' },
      image: source.img,
      finishPhase: new Phase({ en: 'Save costume', zh: '保存造型' }, { status: 'finished', result: source.clone(true) })
    })
    const saved = gen.result
    const originalImage = gen.image
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Generation unavailable'))
    await expect(gen.generate()).rejects.toThrow('Generation unavailable')
    expect(gen.result).toBe(saved)
    expect(gen.image).toBe(originalImage)
    expect(gen.settings.description).toBe('Make the hat blue')

    await gen.generate()
    expect([...aigcMock.tasks.values()].at(-1)?.params).toMatchObject({
      settings: { description: 'Make the hat blue', referenceImageUrl: 'kodo://mock-bucket/original.png' },
      n: 1
    })
    expect(gen.result).toBe(saved)
    expect(gen.image).not.toBe(originalImage)
    const candidate = gen.image
    const result = await gen.finish()
    expect(result.id).toBe(source.id)
    expect(result.img).toBe(candidate)
    expect(gen.settings.description).toBe('Make the hat blue')
    gen.dispose()
    project.dispose()
  })

  it('keeps the saved costume after saving a candidate fails, including across reload and retry', async () => {
    const project = makeSpxProject()
    const sprite = project.sprites[0]
    const source = sprite.costumes[0]
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: source.name, description: 'Change the color' },
      image: mockFile('candidate.png'),
      finishPhase: new Phase({ en: 'Save costume', zh: '保存造型' }, { status: 'finished', result: source.clone(true) })
    })
    const saved = gen.result!
    vi.spyOn(saved, 'getSize').mockRejectedValueOnce(new Error('Image unavailable'))
    await expect(gen.finish()).rejects.toThrow('Image unavailable')
    expect(gen.finishState.status).toBe('failed')
    expect(gen.result).toBe(saved)
    expect(saved.img).toBe(source.img)

    const [config, files] = gen.export()
    const restored = CostumeGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    expect(restored.result?.id).toBe(source.id)
    expect(restored.image?.name).toBe('candidate.png')
    const retried = await gen.finish()
    expect(retried.id).toBe(source.id)
    expect(retried.img.name).toBe('candidate.png')
    expect((await restored.finish()).id).toBe(source.id)
    gen.dispose()
    restored.dispose()
    project.dispose()
  })

  it('retains the saved image task when another candidate is generated but not saved', async () => {
    const project = makeSpxProject()
    const gen = new CostumeGen(i18n, project.sprites[0], project, {
      settings: { name: 'new-costume', description: 'A red hat' }
    })
    await gen.generate()
    await gen.finish()
    const [savedTaskId] = gen.getTaskIds()
    gen.setSettings({ description: 'A blue hat' })
    await gen.generate()
    expect(gen.getTaskIds()).toContain(savedTaskId)
    expect(gen.getTaskIds()).toHaveLength(2)
    const [config, files] = gen.export()
    const restored = CostumeGen.load(i18n, project.sprites[0], project, sndConfig(config), sndFiles(files))
    expect(restored.getTaskIds()).toEqual(gen.getTaskIds())
    expect(restored.image).not.toBe(restored.result?.img)
    await restored.finish()
    expect(restored.getTaskIds()).toHaveLength(1)
    expect(restored.getTaskIds()).not.toContain(savedTaskId)
    gen.dispose()
    restored.dispose()
    project.dispose()
  })

  it('rejects an unsupported reference without replacing the selection', () => {
    const gen = new CostumeGen(i18n, Sprite.create('TestSprite', ''), makeSpxProject())
    gen.setReferenceImageSelection({ type: 'local-image', file: mockFile('reference.png') })
    const selection = gen.referenceImageSelection
    const file = mockFile('reference.svg')

    expect(() => gen.setReferenceImageSelection({ type: 'local-image', file })).toThrow(
      'unsupported reference image type'
    )
    expect(gen.referenceImageSelection).toBe(selection)
    gen.dispose()
  })

  it('encodes a costume name when using it as a directory', () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: 'a/b' },
      image: mockFile('image.png')
    })

    const [, files] = gen.export('gen/assets/sprites/TestSprite')
    expect(Object.keys(files)).toContain('gen/assets/sprites/TestSprite/costumes/a%2Fb/image.png')
  })

  it('does not repeatedly encode a costume name across export/load cycles', () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const basePath = 'gen/assets/sprites/TestSprite'
    let gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: 'a/b' },
      image: mockFile('image.png')
    })

    for (let i = 0; i < 3; i++) {
      const [rawConfig, rawFiles] = gen.export(basePath)
      const files = sndFiles(rawFiles)
      expect(Object.keys(files)).toContain(`${basePath}/costumes/a%2Fb/image.png`)
      expect(Object.keys(files)).not.toContain(`${basePath}/costumes/a%252Fb/image.png`)

      gen = CostumeGen.load(i18n, sprite, project, sndConfig(rawConfig), files, basePath)
      expect(gen.name).toBe('a/b')
    }
  })

  it('should work well', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)

    // 1. Create CostumeGen with initial settings
    const gen = new CostumeGen(i18n, sprite, project, {
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
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'A test costume' } })

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

    const gen1 = new CostumeGen(i18n, sprite, project, { settings: { description: 'First costume' } })
    await gen1.enrich()
    gen1.setSettings({ name: 'costume-1' })
    await gen1.generate()
    const costume1 = await gen1.finish()
    sprite.addCostume(costume1)

    // Create another gen with duplicate name should fail
    const gen2 = new CostumeGen(i18n, sprite, project, { settings: { description: 'Second costume' } })
    await gen2.enrich()
    expect(() => gen2.setName('costume-1')).toThrow()
  })

  it('should throw error when finishing without image', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'A test costume' } })

    await gen.enrich()

    // Try to finish without generating image
    await expect(gen.finish()).rejects.toThrow('Costume not generated yet')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'First description' } })

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should forward ui language to enrich api', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(createI18n({ lang: 'zh' }), sprite, project, {
      settings: { description: 'A test costume' }
    })

    await gen.enrich()
    expect(vi.mocked(aigcMock.enrichCostumeSettings).mock.calls.at(-1)?.[4]).toBe('zh')
  })

  it('should allow multiple generations', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'A test costume' } })

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
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'A test costume' } })

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
    expect(gen.result).toBe(costume)
  })

  it('should cancel running costume generation', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    project.addSprite(sprite)
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'A test costume' } })
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
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'Enrich running costume' } })

    const enrichPromise = gen.enrich()
    expect(gen.enrichState.status).toBe('running')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = CostumeGen.load(i18n, sprite, project, config, files)

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
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { description: 'Enrich finished pre-generate costume' }
    })

    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.generateState.status).toBe('initial')
    expect(gen.image).toBeNull()
    expect(gen.finishState.status).toBe('initial')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = CostumeGen.load(i18n, sprite, project, config, files)

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
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'Generated pre-finish costume' } })

    await gen.enrich()
    await gen.generate()

    expect(gen.generateState.status).toBe('finished')
    expect(gen.image).not.toBeNull()
    expect(gen.finishState.status).toBe('initial')

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    const loadedGen = CostumeGen.load(i18n, sprite, project, config, files)

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
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'A test costume export/load' } })

    await gen.enrich()
    await gen.generate()
    await gen.finish()

    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]

    const loadedGen = CostumeGen.load(i18n, sprite, project, config, files)

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
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'Running test costume' } })

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
    const loadedGen = CostumeGen.load(i18n, sprite, project, config, files)

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

  describe.each(['local-image', 'costume'])('uploading a %s reference', (reference) => {
    it.each(['cancel', 'dispose', 'cancel-and-dispose'])('does not create a task after %s', async (action) => {
      let resolveUpload!: (url: string) => void
      const upload = new Promise<string>((resolve) => {
        resolveUpload = resolve
      })
      const saveFile = mockSaveFile().mockReturnValueOnce(upload)
      const sprite = Sprite.create('TestSprite', '')
      const costume = new Costume('default', mockFile('default.png'))
      sprite.addCostume(costume)
      const gen = new CostumeGen(i18n, sprite, makeSpxProject())
      if (reference === 'local-image')
        gen.setReferenceImageSelection({ type: 'local-image', file: mockFile('reference.png') })
      else gen.setReferenceCostume(costume.id)
      const pending = gen.generate().catch((error) => error)
      await flushPromises()

      if (action !== 'dispose') await gen.cancel()
      if (action !== 'cancel') gen.dispose()
      expect(saveFile.mock.calls[0][1]?.aborted).toBe(true)
      resolveUpload('kodo://mock-bucket/reference.png')
      expect(await pending).toBeInstanceOf(Error)
      expect(aigcMock.tasks.size).toBe(0)
      expect(gen.image).toBeNull()
      if (action === 'cancel') {
        await gen.generate()
        expect(gen.generateState.status).toBe('finished')
        expect(aigcMock.tasks.size).toBe(1)
      }
      gen.dispose()
    })
  })

  it('loads generated costume when the reference file is missing', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: 'idle' },
      referenceImageSelection: { type: 'local-image', file: mockFile('reference.png') }
    })
    await gen.generate()
    const [rawConfig, rawFiles] = gen.export()
    const [config, files] = [sndConfig(rawConfig), sndFiles(rawFiles)]
    if (config.reference?.type !== 'local-image') throw new Error('local reference expected')
    delete files[config.reference.filePath]
    const loaded = CostumeGen.load(i18n, sprite, project, config, files)
    expect(loaded.referenceImageSelection).toBeNull()
    expect(loaded.image?.meta.universalUrl).toBe(gen.image?.meta.universalUrl)
    expect(loaded.getTaskIds()).toEqual(gen.getTaskIds())
    gen.dispose()
    loaded.dispose()
  })

  it('persists only the selected reference image', async () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const defaultCostume = new Costume('default', mockFile('default.png'))
    sprite.addCostume(defaultCostume)
    project.addSprite(sprite)
    const gen = new CostumeGen(i18n, sprite, project, { settings: { description: 'Local ref costume' } })

    const localFile = mockFile('local_character.png')
    gen.setReferenceImageSelection({ type: 'local-image', file: localFile })
    await gen.generate()
    const [localReferenceTask] = [...aigcMock.tasks.values()]
    expect(localReferenceTask.params).toMatchObject({
      settings: { referenceImageUrl: 'kodo://mock-bucket/local_character.png' }
    })

    gen.setReferenceCostume(defaultCostume.id)
    expect(gen.referenceCostume).toBe(defaultCostume)
    const [config, files] = gen.export()
    expect(config.reference).toEqual({ type: 'costume', costumeId: defaultCostume.id })
    expect(Object.keys(files)).not.toContainEqual(expect.stringContaining('reference_image'))

    gen.setReferenceImageSelection(null)
    await gen.generate()
    const taskRecords = [...aigcMock.tasks.values()]
    expect(taskRecords[taskRecords.length - 1].params).toMatchObject({ settings: { referenceImageUrl: null } })

    const [finalConfig, finalFiles] = gen.export()
    const loadedGen = CostumeGen.load(i18n, sprite, project, sndConfig(finalConfig), sndFiles(finalFiles))
    expect(loadedGen.referenceImageSelection).toBeNull()

    loadedGen.setReferenceImageSelection({ type: 'local-image', file: localFile })
    loadedGen.setReferenceImageSelection(null)
    expect(loadedGen.referenceImageSelection).toBeNull()
  })
  it('exports and loads the reference file through the stored selection', () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const file = mockFile('reference.png')
    const gen = new CostumeGen(i18n, sprite, project, {
      settings: { name: 'reference-test' },
      referenceImageSelection: { type: 'local-image', file }
    })
    const [config, files] = gen.export()
    expect(config.reference).toEqual({ type: 'local-image', filePath: expect.any(String) })
    expect(config).not.toHaveProperty('referenceImagePath')
    if (config.reference?.type !== 'local-image') throw new Error('local reference expected')
    expect(files[config.reference.filePath]).toBe(file)

    const loaded = CostumeGen.load(i18n, sprite, project, sndConfig(config), sndFiles(files))
    expect(loaded.referenceImageSelection).toMatchObject({ type: 'local-image', file: { name: file.name } })
    const [saved] = loaded.export()
    expect(saved.reference).toEqual(config.reference)
    gen.dispose()
    loaded.dispose()
    project.dispose()
  })
})

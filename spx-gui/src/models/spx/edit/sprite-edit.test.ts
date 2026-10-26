import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { SpriteCategory, Perspective } from '@/apis/common'
import { setupAigcMock } from '../gen/aigc-mock'
import { createI18n } from '@/utils/i18n'
import * as fileHelpers from '@/models/common/file'
import { mockFile, sndFiles } from '@/models/common/test'
import { History } from '@/components/editor/history'
import { PhysicsMode, RotationStyle, State, type RawSpriteConfig } from '../sprite'
import { Costume } from '../costume'
import { AnimationSoundPlayback } from '../animation'
import { makeSpxProject } from '../common/test'
import { mockSaveFile } from '../gen/test-helpers'
import { SpriteGen, spriteGenAssetPath } from '../gen/sprite-gen'
import { SpriteEdit } from './sprite-edit'
import { createAnimationReferenceVideo } from '../gen/animation-reference-video'

vi.mock('../gen/animation-reference-video', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../gen/animation-reference-video')>()),
  createAnimationReferenceVideo: vi.fn()
}))

const aigcMock = setupAigcMock()
const i18n = createI18n({ lang: 'en' })
vi.spyOn(fileHelpers, 'getImageSize').mockResolvedValue({ width: 512, height: 512 })

describe('SpriteEdit', () => {
  beforeEach(() => {
    aigcMock.reset()
    mockSaveFile()
    vi.mocked(createAnimationReferenceVideo).mockResolvedValue(mockFile('reference.mp4'))
  })

  it('restores planned resources and applies their recommended animation bindings when generated', async () => {
    const project = makeSpxProject()
    const gen = new SpriteGen(i18n, project, { settings: { name: 'Kitten', description: 'A pixel kitten' } })
    onTestFinished(() => {
      gen.dispose()
      project.dispose()
    })
    await gen.genImages()
    gen.setImageIndex(0)
    const { sprite, contentSettings } = await gen.finishDefaultCostume()
    project.addSprite(sprite)
    const edit = SpriteEdit.fromSprite(i18n, project, sprite)
    onTestFinished(() => edit.dispose())
    edit.prefill(contentSettings!)
    expect(sprite.costumes).toHaveLength(1)
    expect(sprite.animations).toHaveLength(0)
    expect(edit.hasPendingChanges).toBe(true)
    expect(aigcMock.tasks.size).toBe(1)

    const [restored] = await SpriteEdit.loadAll(i18n, project, sndFiles(edit.export()))
    onTestFinished(() => restored.dispose())
    expect(restored.costumes.slice(1).map((costume) => costume.settings)).toEqual(contentSettings!.costumes)
    expect(restored.animations.map((animation) => animation.settings)).toEqual(contentSettings!.animations)
    for (const resource of [...restored.costumes.slice(1), ...restored.animations]) {
      expect(resource.result).toBeUndefined()
      expect(resource.referenceCostume?.id).toBe(sprite.defaultCostume!.id)
    }
    const animation = restored.animations[0]
    await animation.generateVideo()
    animation.setFramesConfig({ startTime: 0, duration: 1000, interval: 300 })
    await animation.finish()
    await flushPromises()
    expect(restored.previewSprite.getAnimationBoundStates(animation.result!.id)).toEqual([State.Default])
    expect(sprite.animations).toHaveLength(0)
    restored.applyToSprite(sprite, { type: 'animation', id: animation.id })
    expect(sprite.getAnimationBoundStates(animation.result!.id)).toEqual([State.Default])
  })

  it('restores a running animation edit and applies its result without changing sound or bindings', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    const animation = source.animations[0]
    animation.setSound(project.sounds[0].id)
    animation.setSoundPlayback(AnimationSoundPlayback.Loop)
    source.setAnimationBoundStates(animation.id, [State.Default, State.Step])
    const originalFrames = animation.costumes.map((costume) => costume.img)
    const edit = SpriteEdit.fromSprite(i18n, project, source)
    const gen = edit.animations[0]
    edit.setAnimationInstruction(gen.id, 'Make the hat blue')
    const pending = gen.editVideo(edit.getAnimationInstruction(gen.id))
    await aigcMock.waitForTaskCount(1)
    const [restored] = await SpriteEdit.loadAll(i18n, project, sndFiles(edit.export()))
    expect(restored.getAnimationInstruction(gen.id)).toBe('Make the hat blue')
    expect(restored.animations[0].result?.id).toBe(animation.id)
    await pending
    await flushPromises()
    const restoredGen = restored.animations[0]
    expect(restoredGen.hasPendingVideo).toBe(true)
    expect(restoredGen.framesConfig).toBeNull()
    restoredGen.setFramesConfig({
      startTime: 0,
      duration: 5000,
      interval: 100
    })
    await restoredGen.finish()
    const result = { type: 'animation' as const, id: restoredGen.id }
    expect(source.animations[0].costumes.map((costume) => costume.img)).toEqual(originalFrames)

    const history = new History(project)
    await history.doAction({ name: { en: 'Edit sprite', zh: '编辑精灵' } }, () =>
      restored.applyToSprite(source, result)
    )
    expect(source.animations[0].id).toBe(animation.id)
    expect(source.animations[0].sound).toBe(animation.sound)
    expect(source.animations[0].soundPlayback).toBe(AnimationSoundPlayback.Loop)
    expect(source.animations[0].duration).toBe(5)
    expect(source.animations[0].costumes).toHaveLength(50)
    expect(source.getAnimationBoundStates(animation.id)).toEqual([State.Default, State.Step])
    expect(source.animations[0].costumes[0].img).not.toBe(originalFrames[0])
    await history.undo()
    expect(project.sprites[0].animations[0].costumes.map((costume) => costume.img)).toEqual(originalFrames)
    edit.dispose()
    restored.dispose()
    project.dispose()
  })

  it('restores a running edit task without losing its saved costume or instruction', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    const edit = SpriteEdit.fromSprite(i18n, project, source)
    const costume = edit.costumes[0]
    edit.setCostumeInstruction(costume.id, 'Make the hat blue')
    const pending = costume.edit(edit.getCostumeInstruction(costume.id))
    await aigcMock.waitForTaskCount(1)
    const [restored] = await SpriteEdit.loadAll(i18n, project, sndFiles(edit.export()))
    expect(restored.costumes[0].result?.id).toBe(source.costumes[0].id)
    expect(restored.getCostumeInstruction(costume.id)).toBe('Make the hat blue')
    await pending
    await flushPromises()
    expect(restored.costumes[0].generateState.status).toBe('finished')
    expect(restored.costumes[0].image?.meta.universalUrl).toBe(costume.image?.meta.universalUrl)
    expect(restored.costumes[0].image).not.toBe(restored.costumes[0].result?.img)
    expect(await restored.costumes[0].result!.img.arrayBuffer()).toEqual(await source.costumes[0].img.arrayBuffer())
    expect(aigcMock.tasks.size).toBe(1)
    edit.dispose()
    restored.dispose()
    project.dispose()
  })

  it('migrates legacy editing generations and writes only the independent edit format', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    const edit = SpriteEdit.fromSprite(i18n, project, source)
    edit.costumes[0].setSettings({ description: 'Make the hat blue' })
    await edit.costumes[0].edit('Make the hat blue')
    const legacy = new SpriteGen(i18n, project, { settings: { name: source.name } })
    legacy.costumes = edit.costumes
    legacy.animations = edit.animations
    const files = legacy.export()
    const path = `${spriteGenAssetPath}/${source.name}/index.json`
    const config = (await fileHelpers.toConfig(files[path]!)) as Record<string, unknown>
    files[path] = fileHelpers.fromConfig('index.json', {
      ...config,
      editingSpriteId: source.id,
      editingDefaultCostumeId: source.defaultCostume!.id
    })
    const restoredFiles = sndFiles(files)
    expect(await SpriteGen.loadAll(i18n, project, restoredFiles)).toEqual([])
    const [restored] = await SpriteEdit.loadAll(i18n, project, restoredFiles)
    expect(restored.sourceSpriteId).toBe(source.id)
    expect(restored.id).toBe(legacy.id)
    expect(restored.defaultCostume?.result?.id).toBe(source.defaultCostume!.id)
    expect(restored.getCostumeInstruction(edit.costumes[0].id)).toBe('Make the hat blue')
    await flushPromises()
    expect(restored.costumes[0].image).not.toBe(restored.costumes[0].result?.img)
    expect(source.costumes[0].img).not.toBe(restored.costumes[0].image)
    expect(restored.costumes[0].getTaskIds()).toEqual(edit.costumes[0].getTaskIds())
    expect(Object.keys(restored.export()).every((path) => path.startsWith(`edit/sprites/${source.id}/`))).toBe(true)
    legacy.dispose()
    edit.dispose()
    restored.dispose()
    project.dispose()
  })

  it('opens a detached edit with existing content and the actual default costume', () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    const costume = new Costume('alternate', mockFile('alternate.png'))
    source.addCostume(costume)
    source.setDefaultCostume(costume.id)
    source.animations[0].setSound(project.sounds[0].id)
    source.setAnimationBoundStates(source.animations[0].id, [State.Default, State.Turn, State.Glide])

    const gen = SpriteEdit.fromSprite(i18n, project, source)
    expect(gen.sourceSpriteId).toBe(source.id)
    expect(gen.costumes.map((c) => c.result?.id)).toEqual(source.costumes.map((c) => c.id))
    expect(gen.defaultCostume?.result?.id).toBe(costume.id)
    expect(gen.previewSprite.defaultCostume?.id).toBe(costume.id)
    expect(gen.previewProject.sounds[0].id).toBe(project.sounds[0].id)
    expect(gen.previewProject.sounds[0]).not.toBe(project.sounds[0])
    expect(gen.previewSprite.getAnimationBoundStates(source.animations[0].id)).toEqual([
      State.Default,
      State.Turn,
      State.Glide
    ])
    expect(gen.animations[0].result).not.toBe(source.animations[0])
    gen.costumes[0].result!.setPivot({ x: 11, y: 22 })
    gen.animations[0].result!.setSound(null)
    gen.dispose()

    expect(source.costumes[0].pivot).toEqual({ x: 0, y: 0 })
    expect(source.animations[0].sound).toBe(project.sounds[0].id)
    expect(source.animations[0].isDisposed).toBe(false)
    expect(project.sounds[0].isDisposed).toBe(false)
    project.dispose()
  })

  it('regenerates an existing costume and applies only content in one undoable action', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    source.costumes[0].setImg(mockFile('original.png'))
    const alternate = new Costume('alternate', mockFile('alternate.png'))
    source.addCostume(alternate)
    source.setDefaultCostume(alternate.id)
    source.setCode('onStart => { say "keep me" }')
    source.setX(42)
    source.setY(-17)
    source.setSize(135)
    source.setHeading(75)
    source.setRotationStyle(RotationStyle.Normal)
    source.setPhysicsMode(PhysicsMode.DynamicPhysics)
    source.setCollisionShapeCircle(13)
    source.setCollisionPivot({ x: 7, y: 8 })
    source.setVisible(false)
    source.setIsDraggable(true)
    source.setAssetMetadata({
      description: 'Keep metadata',
      extraSettings: { category: SpriteCategory.Character, perspective: Perspective.SideScrolling }
    })
    const animation = source.animations[0]
    animation.setSound(project.sounds[0].id)
    source.setAnimationBoundStates(animation.id, [State.Default, State.Step, State.Turn, State.Glide])
    const configPath = `assets/sprites/${source.name}/index.json`
    const beforeConfig = (await fileHelpers.toConfig(
      source.export({ sounds: project.sounds })[configPath]!
    )) as RawSpriteConfig
    const originalCostumeIds = source.costumes.map((c) => c.id)
    const frameIds = animation.costumes.map((c) => c.id)
    const sourceId = source.id
    const gen = SpriteEdit.fromSprite(i18n, project, source)
    const costumeGen = gen.costumes[1]
    const oldImage = alternate.img

    expect(costumeGen.referenceCostume?.id).toBe(alternate.id)
    gen.setCostumeInstruction(costumeGen.id, 'Give the character a blue hat')
    await costumeGen.edit(gen.getCostumeInstruction(costumeGen.id))
    expect([...aigcMock.tasks.values()][0].params).toMatchObject({
      settings: { referenceImageUrl: 'kodo://mock-bucket/alternate.png' }
    })
    const newCostume = await costumeGen.finish()
    await flushPromises()
    const result = { type: 'costume' as const, id: costumeGen.id }
    expect(source.costumes.map((c) => c.id)).toEqual(originalCostumeIds)

    const history = new History(project)
    await history.doAction({ name: { en: 'Edit sprite', zh: '修改精灵' } }, () => gen.applyToSprite(source, result))
    expect(project.sprites).toEqual([source])
    expect(source.id).toBe(sourceId)
    expect(source.code).toBe('onStart => { say "keep me" }')
    expect(source.costumes.map((c) => c.id)).toEqual(originalCostumeIds)
    expect(source.costumes[1].img).toBe(newCostume.img)
    expect(source.costumes[1].img).not.toBe(oldImage)
    expect(source.defaultCostume?.id).toBe(alternate.id)
    expect(source.animations[0].id).toBe(animation.id)
    expect(source.animations[0].costumes.map((c) => c.id)).toEqual(frameIds)
    expect(source.animations[0].sound).toBe(project.sounds[0].id)
    const afterConfig = (await fileHelpers.toConfig(
      source.export({ sounds: project.sounds })[configPath]!
    )) as RawSpriteConfig
    expect(afterConfig).toEqual(beforeConfig)
    gen.dispose()
    expect(source.animations[0].isDisposed).toBe(false)

    await history.undo()
    expect(history.getUndoAction()).toBeNull()
    expect(project.sprites[0].id).toBe(sourceId)
    expect(project.sprites[0].costumes.map((c) => c.id)).toEqual(originalCostumeIds)
    expect(project.sprites[0].costumes[1].img).toBe(oldImage)
    expect(await fileHelpers.toConfig(project.sprites[0].export({ sounds: project.sounds })[configPath]!)).toEqual(
      beforeConfig
    )
    await history.redo()
    expect(project.sprites[0].costumes[1].img).toBe(newCostume.img)
    expect(project.sprites[0].code).toBe('onStart => { say "keep me" }')
    project.dispose()
  })

  it('does not apply other resource removals when adopting a costume', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    source.addCostume(new Costume('unused', mockFile('unused.png')))
    source.setAnimationBoundStates(source.animations[0].id, [State.Default])
    const gen = SpriteEdit.fromSprite(i18n, project, source)
    gen.removeCostume(gen.costumes[1].id)
    gen.removeAnimation(gen.animations[0].id)
    gen.applyToSprite(source, { type: 'costume', id: gen.costumes[0].id })

    expect(source.costumes).toHaveLength(2)
    expect(source.animations).toHaveLength(1)
    expect(source.getDefaultAnimation()).toBe(source.animations[0])
    gen.dispose()
    project.dispose()
  })

  it('restores an edit draft with its identity, default costume, sounds and bindings', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    const alternate = new Costume('alternate', mockFile('alternate.png'))
    source.addCostume(alternate)
    source.setDefaultCostume(alternate.id)
    source.animations[0].setSound(project.sounds[0].id)
    source.animations[0].setSoundPlayback(AnimationSoundPlayback.Loop)
    const gen = SpriteEdit.fromSprite(i18n, project, source)
    gen.previewSprite.setAnimationBoundStates(source.animations[0].id, [State.Default, State.Glide])
    const costumeGen = gen.costumes[1]
    gen.setCostumeInstruction(costumeGen.id, 'Make it blue')
    await costumeGen.edit(gen.getCostumeInstruction(costumeGen.id))
    await costumeGen.finish()
    const savedImageURL = costumeGen.result?.img.meta.universalUrl
    const [restored] = await SpriteEdit.loadAll(i18n, project, sndFiles(gen.export()))
    expect(restored.getCostumeInstruction(costumeGen.id)).toBe('Make it blue')
    expect(restored.id).toBe(gen.id)
    expect(restored.previewSprite.code).toBe(source.code)

    expect(restored.sourceSpriteId).toBe(source.id)
    expect(restored.defaultCostume?.result?.id).toBe(alternate.id)
    expect(restored.previewSprite.defaultCostume?.id).toBe(alternate.id)
    expect(restored.costumes[1].result?.img.meta.universalUrl).toBe(savedImageURL)
    expect(restored.costumes[1].image).toBe(restored.costumes[1].result?.img)
    expect(restored.costumes[1].referenceCostume?.id).toBe(alternate.id)
    expect(restored.previewProject.sounds[0].id).toBe(project.sounds[0].id)
    expect(restored.animations[0].result?.sound).toBe(project.sounds[0].id)
    expect(restored.animations[0].result?.soundPlayback).toBe(AnimationSoundPlayback.Loop)
    expect(restored.previewSprite.getAnimationBoundStates(source.animations[0].id)).toEqual([
      State.Default,
      State.Glide
    ])
    gen.dispose()
    restored.dispose()
    project.dispose()
  })
})

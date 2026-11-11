import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { SpriteCategory, Perspective } from '@/apis/common'
import { setupAigcMock } from '../gen/aigc-mock'
import { TaskType } from '@/apis/aigc'
import { createI18n } from '@/utils/i18n'
import * as fileHelpers from '@/models/common/file'
import { mockFile, sndFiles } from '@/models/common/test'
import { History } from '@/components/editor/history'
import { PhysicsMode, RotationStyle, State, type RawSpriteConfig } from '../sprite'
import { Costume } from '../costume'
import { Animation, AnimationSoundPlayback } from '../animation'
import { makeSpxProject } from '../common/test'
import { mockSaveFile } from '../gen/test-helpers'
import { SpriteGen, spriteGenAssetPath } from '../gen/sprite-gen'
import { SpriteEdit } from './sprite-edit'

const aigcMock = setupAigcMock()
const i18n = createI18n({ lang: 'en' })
vi.spyOn(fileHelpers, 'getImageSize').mockResolvedValue({ width: 512, height: 512 })

describe('SpriteEdit', () => {
  beforeEach(() => {
    aigcMock.reset()
    mockSaveFile()
  })

  it('syncs local imports while preserving other AI drafts', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    const edit = SpriteEdit.fromSprite(i18n, project, source)
    onTestFinished(() => {
      edit.dispose()
      project.dispose()
    })
    const draft = edit.addCostume()
    draft.setSettings({ description: 'Keep this generation prompt' })
    const costume = new Costume('uploaded', mockFile('uploaded.png'))
    source.addCostume(costume)
    const animation = Animation.create('grouped', [costume.clone()])
    source.addAnimation(animation)
    source.setAnimationBoundStates(animation.id, [State.Step])

    edit.syncResources(source)
    edit.syncResources(source)
    await flushPromises()

    expect(edit.costumes.filter((gen) => gen.result?.id === costume.id)).toHaveLength(1)
    expect(edit.animations.filter((gen) => gen.result?.id === animation.id)).toHaveLength(1)
    expect(edit.getCostumeById(draft.id)?.settings.description).toBe('Keep this generation prompt')
    const imported = edit.costumes.find((gen) => gen.result?.id === costume.id)!
    expect(edit.isNewResource({ type: 'costume', id: imported.id })).toBe(false)
    expect(edit.hasResourceChanges({ type: 'costume', id: imported.id })).toBe(false)
    expect(imported.result).not.toBe(costume)
    expect(edit.previewSprite.getAnimationBoundStates(animation.id)).toEqual([State.Step])
  })

  it('removes grouped source costumes from the edit list but retains their unsaved drafts', async () => {
    const project = makeSpxProject()
    const source = project.sprites[0]
    const clean = new Costume('clean', mockFile('clean.png'))
    const changed = new Costume('changed', mockFile('changed.png'))
    source.addCostume(clean)
    source.addCostume(changed)
    const edit = SpriteEdit.fromSprite(i18n, project, source)
    onTestFinished(() => {
      edit.dispose()
      project.dispose()
    })
    const draft = edit.costumes.find((gen) => gen.result?.id === changed.id)!
    edit.setCostumeInstruction(draft.id, 'Keep this edit instruction')
    source.removeCostume(clean.id)
    source.removeCostume(changed.id)

    edit.syncResources(source)
    await flushPromises()

    expect(edit.costumes.some((gen) => gen.result?.id === clean.id)).toBe(false)
    expect(edit.getCostumeInstruction(draft.id)).toBe('Keep this edit instruction')
    expect(edit.isNewResource({ type: 'costume', id: draft.id })).toBe(true)
    expect(edit.defaultCostume?.result?.id).toBe(source.defaultCostume?.id)
  })

  it.each(['costume', 'animation'] as const)('keeps a recommended %s as a draft until adoption', async (type) => {
    const project = makeSpxProject()
    const edit = SpriteEdit.fromSprite(i18n, project, project.sprites[0])
    onTestFinished(() => {
      edit.dispose()
      project.dispose()
    })
    const manualCostume = edit.addCostume()
    const manualAnimation = edit.addAnimation()
    edit.prefill({
      costumes: [{ ...manualCostume.settings, name: 'cape', description: 'Wearing a cape', referenceImageUrl: null }],
      animations: [{ ...manualAnimation.settings, name: 'run', description: 'Running', referenceFrameUrl: null }],
      animationBindings: {}
    })
    const gen = type === 'costume' ? edit.costumes.at(-1)! : edit.animations.at(-1)!
    edit.setSelectedItem({ type, id: gen.id })
    expect(edit.isSuggestedResource(gen.id)).toBe(true)
    expect(edit.isSuggestedResource(manualCostume.id)).toBe(false)
    expect(edit.isSuggestedResource(manualAnimation.id)).toBe(false)

    edit.editHistory.record(gen)
    const generating = type === 'costume' ? edit.costumes.at(-1)!.generate() : edit.animations.at(-1)!.generateVideo()
    expect(edit.isSuggestedResource(gen.id)).toBe(true)
    await generating
    expect(edit.isNewResource({ type, id: gen.id })).toBe(true)
    edit.editHistory.undo(gen)
    expect(edit.isSuggestedResource(gen.id)).toBe(true)

    const [restored] = await SpriteEdit.loadAll(i18n, project, sndFiles(edit.export()))
    onTestFinished(() => restored.dispose())
    expect(restored.isSuggestedResource(gen.id)).toBe(true)
    const untouched = type === 'costume' ? edit.animations.at(-1)! : edit.costumes.at(-1)!
    expect(restored.isSuggestedResource(untouched.id)).toBe(true)
    restored.editHistory.redo(
      type === 'costume' ? restored.getCostumeById(gen.id)! : restored.getAnimationById(gen.id)!
    )
    const restoredGen = type === 'costume' ? restored.getCostumeById(gen.id)! : restored.getAnimationById(gen.id)!
    if (type === 'animation')
      restored.getAnimationById(gen.id)!.setFramesConfig({ startTime: 0, duration: 1000, interval: 100 })
    await restoredGen.finish()
    expect(restored.isNewResource({ type, id: gen.id })).toBe(true)
    restored.applyToSprite(project.sprites[0], { type, id: gen.id })
    expect(restored.isNewResource({ type, id: gen.id })).toBe(false)
    expect(restored.isSuggestedResource(gen.id)).toBe(false)
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
    expect([...aigcMock.tasks.values()].map(({ task, params }) => ({ type: task.type, params }))).toEqual([
      { type: TaskType.GenerateCostume, params: expect.objectContaining({ removeBackground: true }) }
    ])

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

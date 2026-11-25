import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest'
import { setupAigcMock } from '@/models/spx/gen/aigc-mock'
import { Cancelled } from '@/utils/exception'
import { createI18n } from '@/utils/i18n'
import * as files from '@/models/common/file'
import { makeSpxProject } from '@/models/spx/common/test'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { mockSaveFile } from '@/models/spx/gen/test-helpers'
import { State } from '@/models/spx/sprite'
import { GenState } from './gen'
import { History } from './history'

const api = setupAigcMock()
const i18n = createI18n({ lang: 'en' })

beforeEach(() => {
  api.reset()
  mockSaveFile()
  vi.spyOn(files, 'getImageSize').mockResolvedValue({ width: 512, height: 512 })
})

async function setup() {
  const project = makeSpxProject()
  const state = new GenState(i18n, project)
  const gen = new SpriteGen(i18n, project, { settings: { name: 'Fox', description: 'A fox' } })
  onTestFinished(() => {
    state.dispose()
    project.dispose()
    gen.dispose()
  })
  await gen.genImages()
  gen.setImageIndex(0)
  return { project, state, gen }
}

describe('sprite generation in the editor', () => {
  it('adds the chosen costume and keeps recommended resources out of the game until adoption', async () => {
    const { project, state, gen } = await setup()
    const { sprite, suggestions } = await gen.finishWithDefaultCostume()
    project.addSprite(sprite)
    state.spriteResources.suggest(sprite, suggestions)
    expect(sprite.costumes).toHaveLength(1)
    expect(sprite.animations).toHaveLength(0)
    expect(state.sprites).toHaveLength(0)
    expect(state.spriteResources.drafts.map((d) => d.gen.name)).toEqual(['costume-1', 'costume-2', 'walk', 'jump'])
    expect(
      state.spriteResources.drafts.every((d) => d.suggested && d.gen.referenceCostume === sprite.defaultCostume)
    ).toBe(true)

    const draft = state.spriteResources.drafts[2]
    const animation = draft.gen
    expect.assert(animation instanceof AnimationGen)
    await animation.generateVideo()
    animation.setFramesConfig({ startTime: 100, duration: 600, interval: 100 })
    animation.setFramesConfig({ startTime: 200, duration: 400, interval: 100 })
    expect(draft.versions).toHaveLength(1)
    sprite.defaultCostume!.setPivot({ x: 120, y: 170 })
    const adopted = await state.spriteResources.adopt(draft, new History(project))
    expect(sprite.animations[0]).toBe(adopted)
    expect(sprite.animations[0].duration).toBe(0.4)
    expect(sprite.animations[0].costumes[0].pivot).toEqual({ x: 120, y: 170 })
    expect(sprite.getAnimationBoundStates(adopted.id)).toEqual([State.Default])
    expect(state.spriteResources.drafts).not.toContain(draft)
  })

  it('restores versions with the project and branches only after a successful generation', async () => {
    const { project, state, gen } = await setup()
    const { sprite } = await gen.finishWithDefaultCostume()
    project.addSprite(sprite)
    const original = state.spriteResources.addCostume(sprite)
    expect.assert(original.gen instanceof CostumeGen)
    original.gen.setSettings({ description: 'Red scarf' })
    await original.gen.generate()
    original.gen.setSettings({ description: 'Green scarf' })
    await original.gen.generate()
    expect(original.index).toBe(1)
    const gameFiles = project.exportFiles()
    expect(Object.keys(gameFiles).some((path) => path.startsWith('gen/'))).toBe(false)
    const stored = state.export()
    await project.loadFiles(gameFiles)
    await state.load(stored)
    const draft = state.spriteResources.drafts[0]
    expect(draft.id).toBe(original.id)
    expect(draft.gen.sprite).toBe(project.sprites.find((s) => s.id === sprite.id))
    expect(draft.index).toBe(1)
    draft.select(0)
    expect(draft.gen.settings.description).toBe('Red scarf')
    draft.select(-1)
    expect(draft.hasMedia).toBe(false)
    expect(draft.gen.settings.description).toBe('Red scarf')
    expect(draft.versions).toHaveLength(2)
    draft.select(0)
    draft.select(10)
    expect(draft.index).toBe(0)
    draft.select(1)
    expect(draft.gen.settings.description).toBe('Green scarf')
    draft.select(0)
    const first = draft.gen
    expect.assert(first instanceof CostumeGen)
    api.injectErrorOnce('subscribeTaskEvents', new Error('Disconnected'))
    await expect(first.generate()).rejects.toThrow('Disconnected')
    expect(draft.versions).toHaveLength(2)
    first.setSettings({ description: 'Blue scarf' })
    await first.generate()
    expect(draft.index).toBe(1)
    expect(draft.versions).toHaveLength(2)
    draft.select(0)
    draft.select(1)
    expect(draft.gen.settings.description).toBe('Blue scarf')
    draft.discard()
    expect(draft.hasMedia).toBe(false)
    expect(draft.versions).toHaveLength(0)
    expect(draft.gen.sprite.costumes).toHaveLength(1)
  })

  it('keeps the selected trim for each video when switching versions and reopening the project', async () => {
    const { project, state, gen } = await setup()
    const { sprite } = await gen.finishWithDefaultCostume()
    project.addSprite(sprite)
    const draft = state.spriteResources.addAnimation(sprite)
    expect.assert(draft.gen instanceof AnimationGen)
    draft.gen.setSettings({ description: 'Jump' })
    await draft.gen.generateVideo()
    const firstRange = { startTime: 200, duration: 630, interval: 90 }
    draft.gen.setFramesConfig(firstRange)
    await draft.gen.generateVideo()
    draft.gen.setFramesConfig({ startTime: 0, duration: 1200, interval: 100 })
    draft.select(0)
    expect(draft.gen.framesConfig).toEqual(firstRange)
    const saved = state.export()
    await state.load(saved)
    const reloaded = state.spriteResources.drafts[0]
    expect.assert(reloaded.gen instanceof AnimationGen)
    expect(reloaded.gen.framesConfig).toEqual(firstRange)
    reloaded.select(1)
    expect(reloaded.gen.framesConfig?.duration).toBe(1200)
    expect(reloaded.versions).toHaveLength(2)
  })

  it('does not adopt a removed draft when its pending operation finishes', async () => {
    const { project, state, gen } = await setup()
    const { sprite } = await gen.finishWithDefaultCostume()
    project.addSprite(sprite)
    const draft = state.spriteResources.addCostume(sprite)
    expect.assert(draft.gen instanceof CostumeGen)
    await draft.gen.generate()
    const history = new History(project)
    const pending = state.spriteResources.adopt(draft, history)
    state.spriteResources.remove(draft)
    await expect(pending).rejects.toBeInstanceOf(Cancelled)
    expect(sprite.costumes).toHaveLength(1)
    expect(history.getUndoAction()).toBeNull()
  })

  it('loads a legacy unfinished sprite back into the original generation flow', async () => {
    const { state, gen } = await setup()
    await gen.prepareContent()
    state.addSprite(gen)
    await state.load(state.export())
    expect(state.spriteResources.drafts).toHaveLength(0)
    const [legacy] = state.sprites
    expect(legacy.isPreparePhase).toBe(false)
    expect(legacy.animations).toHaveLength(2)
    expect(legacy.costumes).toHaveLength(3)
    await legacy.costumes[1].generate()
    await legacy.costumes[1].finish()
    const completed = await legacy.finish()
    expect(completed.costumes.map((c) => c.name)).toEqual(['default', 'costume-1'])
  })
})

import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { nextTick } from 'vue'
import { setupAigcMock } from '../gen/aigc-mock'
import { TaskType } from '@/apis/aigc'
import { createI18n } from '@/utils/i18n'
import * as fileHelpers from '@/models/common/file'
import { mockFile, sndFiles } from '@/models/common/test'
import { makeSpxProject } from '../common/test'
import { mockSaveFile } from '../gen/test-helpers'
import { createAnimationReferenceVideo } from '../gen/animation-reference-video'
import { SpriteEdit } from './sprite-edit'

vi.mock('../gen/animation-reference-video', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../gen/animation-reference-video')>()),
  createAnimationReferenceVideo: vi.fn(),
  prepareAnimationReferenceVideo: vi.fn(async (video) => video)
}))
const aigc = setupAigcMock()
const i18n = createI18n({ lang: 'en' })
vi.spyOn(fileHelpers, 'getImageSize').mockResolvedValue({ width: 512, height: 512 })

function setup() {
  const project = makeSpxProject()
  const source = project.sprites[0]
  const edit = SpriteEdit.fromSprite(i18n, project, source)
  onTestFinished(() => {
    edit.dispose()
    project.dispose()
  })
  return { project, source, edit }
}

beforeEach(() => {
  aigc.reset()
  mockSaveFile()
  vi.mocked(createAnimationReferenceVideo).mockReset().mockResolvedValue(mockFile('reference.mp4'))
})

describe('Resource edit drafts', () => {
  it('iterates from the current costume and persists undo/redo without changing the source', async () => {
    const { project, source, edit } = setup()
    const gen = edit.costumes[0]
    const originalImage = source.costumes[0].img
    await edit.editCostume(gen.id, 'Red hair')
    gen.setImage(mockFile('first-result.png'))
    const first = gen.image!
    await edit.editCostume(gen.id, 'Blue coat')
    expect([...aigc.tasks.values()].at(-1)!.params).toMatchObject({
      settings: { referenceImageUrl: `kodo://mock-bucket/${first.name}` },
      editInstruction: 'Blue coat'
    })
    const second = gen.image!
    expect([...aigc.tasks.values()].map(({ task }) => task.type)).toEqual([
      TaskType.GenerateCostume,
      TaskType.GenerateCostume
    ])
    expect(gen.result!.img).toBe(originalImage)
    edit.editHistory.undo(gen)
    expect(edit.costumes[0].image).toBe(first)
    const taskCount = aigc.tasks.size
    const [restored] = await SpriteEdit.loadAll(i18n, project, sndFiles(edit.export()))
    onTestFinished(() => restored.dispose())
    expect(restored.editHistory.canRedo(gen.id)).toBe(true)
    restored.editHistory.redo(restored.costumes[0])
    expect(restored.costumes[0].image?.name).toBe(second.name)
    expect(restored.costumes[0].image).not.toBe(restored.costumes[0].result!.img)
    expect(aigc.tasks.size).toBe(taskCount)
    restored.editHistory.undo(restored.costumes[0])
    await restored.editCostume(gen.id, 'Green coat')
    expect([...aigc.tasks.values()].at(-1)!.params).toMatchObject({
      settings: { referenceImageUrl: `kodo://mock-bucket/${first.name}` }
    })
    expect(restored.editHistory.canRedo(gen.id)).toBe(false)
    expect(source.costumes[0].img).toBe(originalImage)

    const candidate = restored.costumes[0].image!
    await restored.costumes[0].finish()
    expect([...aigc.tasks.values()].at(-1)).toMatchObject({
      task: { type: TaskType.RemoveBackground },
      params: { imageUrl: `kodo://mock-bucket/${candidate.name}` }
    })
    expect(source.costumes[0].img).toBe(originalImage)
    restored.applyToSprite(source, { type: 'costume', id: gen.id })
    expect(source.costumes[0].img).toBe(restored.costumes[0].image)
    expect(source.costumes[0].img).not.toBe(candidate)
    expect(restored.editHistory.canUndo(gen.id)).toBe(false)
  })

  it('adopts only the selected resource and clears only its history', async () => {
    const { source, edit } = setup()
    const originalCostume = source.costumes[0]
    const originalAnimation = source.animations[0]
    const costume = edit.costumes[0]
    const animation = edit.animations[0]
    await edit.editCostume(costume.id, 'Blue hat')
    await edit.editAnimation(animation.id, 'White hair')
    animation.setFramesConfig({ startTime: 0, duration: 800, interval: 100 })
    await animation.finish()
    await nextTick()

    edit.applyToSprite(source, { type: 'animation', id: animation.id })
    expect(source.costumes[0]).toBe(originalCostume)
    expect(source.animations[0]).not.toBe(originalAnimation)
    expect(source.animations[0].duration).toBe(0.8)
    expect(source.animations[0].costumes[0].img).toBe(animation.result!.costumes[0].img)
    expect(edit.editHistory.canUndo(animation.id)).toBe(false)
    expect(edit.editHistory.canRedo(animation.id)).toBe(false)
    expect(edit.editHistory.canUndo(costume.id)).toBe(true)

    await costume.finish()
    edit.applyToSprite(source, { type: 'costume', id: costume.id })
    expect(source.costumes[0].img).toBe(costume.result!.img)
    expect(edit.editHistory.export()).toEqual([{}, {}])
    expect(Object.keys(edit.export()).some((path) => path.includes('/history/'))).toBe(false)
  })

  it('uses the current animation preview as the next reference and restores its trim on undo', async () => {
    const { source, edit } = setup()
    const gen = edit.animations[0]
    const original = source.animations[0]
    await edit.editAnimation(gen.id, 'Red hair')
    gen.setFramesConfig({ startTime: 100, duration: 400, interval: 100 })
    const firstVideo = gen.video
    await edit.editAnimation(gen.id, 'Blue coat')
    expect(createAnimationReferenceVideo).toHaveBeenCalledTimes(1)
    expect([...aigc.tasks.values()].at(-1)!.params).toMatchObject({
      settings: { referenceVideoUrl: `kodo://mock-bucket/${firstVideo!.name}` },
      editInstruction: 'Blue coat'
    })
    expect([...aigc.tasks.values()].map(({ task }) => task.type)).toEqual([
      TaskType.GenerateAnimationVideo,
      TaskType.GenerateAnimationVideo
    ])
    expect(gen.result?.costumes[0].img).toBe(original.costumes[0].img)
    const secondVideo = gen.video
    const taskCount = aigc.tasks.size

    edit.editHistory.undo(gen)
    expect(edit.animations[0].video).toBe(firstVideo)
    expect(edit.animations[0].framesConfig).toEqual({ startTime: 100, duration: 400, interval: 100 })
    expect(edit.animations[0].hasPendingVideo).toBe(true)
    edit.editHistory.redo(edit.animations[0])
    expect(edit.animations[0].video).toBe(secondVideo)
    expect(aigc.tasks.size).toBe(taskCount)
    expect(source.animations[0]).toBe(original)
  })

  it('can undo a failed edit to the last successful preview', async () => {
    const { source, edit } = setup()
    const gen = edit.costumes[0]
    const originalImage = source.costumes[0].img
    await edit.editCostume(gen.id, 'Red hair')
    const preview = gen.image
    aigc.injectErrorOnce('subscribeTaskEvents', new Error('Unavailable'))
    await expect(edit.editCostume(gen.id, 'Blue coat')).rejects.toThrow('Unavailable')
    expect(gen.image).toBe(preview)
    edit.editHistory.undo(gen)
    expect(edit.costumes[0].generateState.status).toBe('finished')
    expect(edit.costumes[0].image).toBe(preview)
    expect(edit.costumes[0].result?.img).toBe(originalImage)
    expect(source.costumes[0].img).toBe(originalImage)
  })
})

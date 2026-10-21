import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { Cancelled } from '@/utils/exception'
import * as fileHelpers from '@/models/common/file'
import { mockFile } from '@/models/common/test'
import { makeSpxProject } from '../common/test'
import { setupAigcMock } from './aigc-mock'
import { TaskType } from '@/apis/aigc'
import { SpriteEdit } from '../edit/sprite-edit'
import { CostumeGen } from './costume-gen'
import { mockSaveFile } from './test-helpers'
import { setSpriteEditDemoEnabled } from './edit-demo'

vi.mock('./animation-reference-video', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./animation-reference-video')>()),
  prepareAnimationReferenceVideo: vi.fn(async (video) => video)
}))
vi.spyOn(fileHelpers, 'getImageSize').mockResolvedValue({ width: 512, height: 512 })
const aigc = setupAigcMock()
const i18n = createI18n({ lang: 'en' })

beforeEach(() => {
  aigc.reset()
  mockSaveFile()
  vi.useFakeTimers()
  setSpriteEditDemoEnabled(true)
  onTestFinished(() => {
    setSpriteEditDemoEnabled(false)
    vi.useRealTimers()
  })
})

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

describe('Sprite editing live demo', () => {
  it('edits costumes through the existing image API and preserves undo, redo and adoption', async () => {
    const { source, edit } = setup()
    const gen = edit.costumes[0]
    const original = source.costumes[0].img
    gen.setSettings({ description: 'Original costume description' })
    const item = { type: 'costume' as const, id: gen.id }
    const pending = edit.editCostume(gen.id, 'Make the hat blue')
    expect(source.costumes[0].img).toBe(original)
    await vi.runAllTimersAsync()
    await pending
    expect(aigc.tasks.size).toBe(1)
    const task = [...aigc.tasks.values()][0]
    expect(task.task.type).toBe(TaskType.GenerateCostume)
    expect(task.params).toMatchObject({
      settings: {
        referenceImageUrl: `kodo://mock-bucket/${original.name}`,
        description: expect.stringContaining('Edit instruction: Make the hat blue')
      },
      n: 1
    })
    expect(task.params).not.toHaveProperty('editInstruction')
    expect(JSON.stringify(task.params)).not.toContain('Original costume description')
    expect(gen.settings.description).toBe('Original costume description')
    expect(edit.hasResourceChanges(item)).toBe(true)
    expect(source.costumes[0].img).toBe(original)
    const candidate = gen.result!.img
    expect(candidate).not.toBe(original)

    edit.editHistory.undo(gen)
    expect(edit.hasResourceChanges(item)).toBe(false)
    edit.editHistory.redo(edit.costumes[0])
    expect(edit.hasResourceChanges(item)).toBe(true)
    edit.applyToSprite(source, item)
    expect(source.costumes[0].img).toBe(candidate)
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
  })

  it('returns the reference video and supports cancelling the simulated edit', async () => {
    const { source, edit } = setup()
    const gen = edit.animations[0]
    const original = source.animations[0]
    const video = mockFile('reference.mp4')
    gen.setVideo(video)
    const pending = edit.editAnimation(gen.id, 'Make the hat blue')
    await vi.advanceTimersByTimeAsync(3000)
    await pending
    expect(gen.hasPendingVideo).toBe(true)
    expect(await gen.video!.arrayBuffer()).toEqual(await video.arrayBuffer())
    expect(source.animations[0]).toBe(original)
    expect(aigc.tasks.size).toBe(0)

    const candidate = gen.video
    const cancelled = gen.editVideo('Make the hat red')
    const rejection = expect(cancelled).rejects.toBeInstanceOf(Cancelled)
    await vi.advanceTimersByTimeAsync(1000)
    await gen.cancel()
    await rejection
    await vi.advanceTimersByTimeAsync(3000)
    expect(gen.video).toBe(candidate)
    expect(aigc.tasks.size).toBe(0)
  })

  it('keeps ordinary generation connected to the backend', async () => {
    const { project, source } = setup()
    const gen = new CostumeGen(i18n, source, project)
    onTestFinished(() => gen.dispose())
    const pending = gen.generate()
    await vi.runAllTimersAsync()
    await pending
    expect(gen.generateState.status).toBe('finished')
    expect(aigc.tasks.size).toBe(1)
  })
})

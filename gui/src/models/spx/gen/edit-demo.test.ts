import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { Cancelled } from '@/utils/exception'
import * as fileHelpers from '@/models/common/file'
import { makeSpxProject } from '../common/test'
import { setupAigcMock } from './aigc-mock'
import { TaskType } from '@/apis/aigc'
import { SpriteEdit } from '../edit/sprite-edit'
import { CostumeGen } from './costume-gen'
import { AnimationGen } from './animation-gen'
import { mockSaveFile } from './test-helpers'
import { setSpriteEditDemoEnabled } from './edit-demo'

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
  it('simulates text edits and preserves undo, redo and adoption without creating AI tasks', async () => {
    const { source, edit } = setup()
    const gen = edit.costumes[0]
    const original = source.costumes[0].img
    gen.setSettings({ description: 'Original costume description' })
    const item = { type: 'costume' as const, id: gen.id }
    const pending = edit.editCostume(gen.id, 'Make the hat blue')
    expect(source.costumes[0].img).toBe(original)
    await vi.runAllTimersAsync()
    await pending
    expect(aigc.tasks.size).toBe(0)
    expect(gen.settings.description).toBe('Original costume description')
    expect(edit.hasResourceChanges(item)).toBe(true)
    expect(source.costumes[0].img).toBe(original)
    const candidate = gen.image
    expect(candidate).not.toBe(original)
    expect(await candidate!.arrayBuffer()).toEqual(await original.arrayBuffer())

    edit.editHistory.undo(gen)
    expect(edit.hasResourceChanges(item)).toBe(false)
    edit.editHistory.redo(edit.costumes[0])
    expect(edit.hasResourceChanges(item)).toBe(true)
    await edit.costumes[0].finish()
    edit.applyToSprite(source, item)
    expect(source.costumes[0].img).toBe(candidate)
    expect(edit.editHistory.canUndo(gen.id)).toBe(false)
  })

  it.each(['', 'Keep everything else unchanged'])(
    'simulates point edits with global instruction %j without creating AI tasks',
    async (instruction) => {
      const { source, edit } = setup()
      const gen = edit.costumes[0]
      const original = source.costumes[0].img
      const comments = [{ id: 'point', x: 0.6, y: 0.4, content: 'Make this blue' }]
      gen.setEditComments(comments)
      const pending = edit.editCostume(gen.id, instruction)
      await vi.advanceTimersByTimeAsync(2999)
      expect(gen.generateState.status).toBe('running')
      expect(gen.image).toBe(original)
      await vi.advanceTimersByTimeAsync(1)
      await pending
      const preview = gen.image!
      expect(preview).not.toBe(original)
      expect(await preview.arrayBuffer()).toEqual(await original.arrayBuffer())
      expect(gen.editComments).toEqual([])
      expect(source.costumes[0].img).toBe(original)
      expect(aigc.tasks.size).toBe(0)

      edit.editHistory.undo(gen)
      expect(edit.costumes[0].editComments).toEqual(comments)
      edit.editHistory.redo(edit.costumes[0])
      const restored = edit.costumes[0]
      expect(restored.image).toBe(preview)
      restored.setEditComments(comments)
      const cancelled = restored.edit('Make it green')
      const rejection = expect(cancelled).rejects.toBeInstanceOf(Cancelled)
      await vi.advanceTimersByTimeAsync(1000)
      await restored.cancel()
      await rejection
      expect(restored.image).toBe(preview)
      expect(restored.editComments).toEqual(comments)

      restored.resetGenerateState()
      await restored.finish()
      edit.applyToSprite(source, { type: 'costume', id: restored.id })
      expect(source.costumes[0].img).toBe(preview)
      expect(edit.editHistory.canUndo(restored.id)).toBe(false)
      expect(aigc.tasks.size).toBe(0)
    }
  )

  it('keeps ordinary generation connected to the backend', async () => {
    const { project, source } = setup()
    const gen = new CostumeGen(i18n, source, project)
    onTestFinished(() => gen.dispose())
    const pending = gen.generate()
    await vi.runAllTimersAsync()
    await pending
    expect(gen.generateState.status).toBe('finished')
    expect(aigc.tasks.size).toBe(1)
    expect([...aigc.tasks.values()][0].task.type).toBe(TaskType.GenerateCostume)
  })
  it('keeps animation generation connected to the backend in demo mode', async () => {
    const { project, source } = setup()
    const gen = new AnimationGen(i18n, source, project, { referenceCostumeId: source.costumes[0].id })
    onTestFinished(() => gen.dispose())
    const pending = gen.generateVideo()
    await vi.runAllTimersAsync()
    await pending
    expect(gen.generateVideoState.status).toBe('finished')
    expect(aigc.tasks.size).toBe(1)
    expect([...aigc.tasks.values()][0].task.type).toBe(TaskType.GenerateAnimationVideo)
  })
})

import { nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { makeSpxProject } from '@/models/spx/common/test'
import { setSpriteEditDemoEnabled } from '@/models/spx/gen/edit-demo'
import { BackdropEditState } from './backdrop-edit'

describe('Backdrop editing state', () => {
  it('restores unaccepted versions and instructions without changing the saved backdrop', async () => {
    const project = makeSpxProject()
    const state = new BackdropEditState(project)
    const restored = new BackdropEditState(project)
    vi.useFakeTimers()
    setSpriteEditDemoEnabled(true)
    onTestFinished(() => {
      state.dispose()
      restored.dispose()
      project.dispose()
      vi.useRealTimers()
      setSpriteEditDemoEnabled(false)
    })
    const source = project.stage.backdrops[0]
    const original = source.img
    const edit = state.start(source)
    expect(state.export()).toEqual({})
    const pending = edit.edit('Sunset')
    await vi.advanceTimersByTimeAsync(3000)
    await pending
    const files = state.export()
    await restored.load(files)
    const draft = restored.start(source)
    expect(draft.instruction).toBe('Sunset')
    expect(draft.version).toBe(1)
    expect(draft.hasChanges).toBe(true)
    expect(source.img).toBe(original)
    draft.undo()
    expect(draft.hasChanges).toBe(false)
    draft.redo()
    expect(draft.hasChanges).toBe(true)
    draft.discard()
    expect(restored.export()).toEqual({})
  })

  it('keeps drafts when selecting another backdrop and disposes them when the source is removed', async () => {
    const project = makeSpxProject()
    const state = new BackdropEditState(project)
    onTestFinished(() => {
      state.dispose()
      project.dispose()
    })
    const source = project.stage.backdrops[0]
    const other = source.clone()
    project.stage.addBackdrop(other)
    const edit = state.start(source)
    edit.instruction = 'Keep the trees'
    state.start(other)
    expect(state.start(source)).toBe(edit)
    expect(state.start(source).instruction).toBe('Keep the trees')
    project.stage.removeBackdrop(source.id)
    await nextTick()
    expect(edit.isDisposed).toBe(true)
    expect(state.edits).toHaveLength(1)
  })
})

import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { Cancelled } from '@/utils/exception'
import { mockFile } from '@/models/common/test'
import { Backdrop } from '../backdrop'
import { setSpriteEditDemoEnabled } from '../gen/edit-demo'
import { BackdropEdit } from './backdrop-edit'

beforeEach(() => {
  vi.useFakeTimers()
  setSpriteEditDemoEnabled(true)
  onTestFinished(() => {
    vi.useRealTimers()
    setSpriteEditDemoEnabled(false)
  })
})

function setup() {
  const backdrop = new Backdrop('Forest', mockFile('forest.png'), { pivot: { x: 180, y: 100 }, bitmapResolution: 2 })
  const edit = new BackdropEdit(backdrop.id, backdrop.img)
  onTestFinished(() => edit.dispose())
  return { backdrop, edit }
}

async function generate(edit: BackdropEdit, instruction: string) {
  const pending = edit.edit(instruction)
  await vi.advanceTimersByTimeAsync(3000)
  await pending
}

describe('Backdrop edit drafts', () => {
  it('keeps versions separate from the stage and applies only the chosen image', async () => {
    const { backdrop, edit } = setup()
    const original = backdrop.img
    await generate(edit, 'Make it sunset')
    const first = edit.image
    await generate(edit, 'Add clouds')
    const second = edit.image
    expect(backdrop.img).toBe(original)
    expect(edit.version).toBe(2)
    edit.undo()
    expect(edit.image).toBe(first)
    expect(edit.instruction).toBe('Add clouds')
    edit.redo()
    expect(edit.image).toBe(second)
    edit.applyToBackdrop(backdrop)
    edit.accept()
    expect(backdrop.img).toBe(second)
    expect(backdrop.pivot).toEqual({ x: 180, y: 100 })
    expect(backdrop.bitmapResolution).toBe(2)
    expect(edit.hasPendingChanges).toBe(false)
    expect(edit.hasChanges).toBe(false)
  })

  it('restores local instructions and drops the redo branch when editing an earlier version', async () => {
    const { edit } = setup()
    const comment = { id: 'tree', x: 0.3, y: 0.6, content: 'Make this tree taller' }
    edit.setEditComments([comment])
    await generate(edit, '')
    expect(edit.editComments).toEqual([])
    edit.undo()
    expect(edit.editComments).toEqual([comment])
    expect(edit.hasChanges).toBe(false)
    expect(edit.canRedo).toBe(true)
    await generate(edit, 'Keep the lighting')
    expect(edit.canRedo).toBe(false)
    expect(edit.version).toBe(1)
  })

  it('persists original, versions and unsent local edits without adopting them', async () => {
    const { backdrop, edit } = setup()
    await generate(edit, 'Night scene')
    edit.undo()
    edit.setEditComments([{ id: 'sky', x: 0.5, y: 0.1, content: 'Add stars' }])
    const [config, files] = edit.export('draft')
    const restored = BackdropEdit.load(config, files)
    onTestFinished(() => restored.dispose())
    expect(restored.hasChanges).toBe(false)
    expect(restored.canRedo).toBe(true)
    expect(restored.editComments).toEqual(edit.editComments)
    restored.redo()
    expect(restored.hasChanges).toBe(true)
    expect(backdrop.img).not.toBe(restored.image)
    restored.discard()
    expect(restored.image).toBe(backdrop.img)
    expect(restored.hasPendingChanges).toBe(false)
  })

  it('prevents concurrent edits and cancels without creating a version when disposed', async () => {
    const { edit, backdrop } = setup()
    const pending = edit.edit('Sunset')
    const rejected = expect(pending).rejects.toBeInstanceOf(Cancelled)
    await edit.edit('Night')
    expect(edit.instruction).toBe('Sunset')
    edit.dispose()
    await rejected
    expect(edit.image).toBe(backdrop.img)
    expect(edit.canUndo).toBe(false)
  })

  it('never silently mocks editing when demo mode is disabled', async () => {
    const { edit } = setup()
    setSpriteEditDemoEnabled(false)
    await expect(edit.edit('Sunset')).rejects.toThrow('only available in the editing demo')
    expect(edit.generateState.status).toBe('initial')
  })
})

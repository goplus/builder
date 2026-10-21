import { nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { sndFiles } from '@/models/common/test'
import { makeSpxProject } from '@/models/spx/common/test'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { GenState } from './gen'
import { SpriteEditState } from './sprite-edit'

function setup() {
  const i18n = createI18n({ lang: 'en' })
  const project = makeSpxProject()
  const state = new SpriteEditState(i18n, project)
  onTestFinished(() => {
    state.dispose()
    project.dispose()
  })
  return { i18n, project, state, source: project.sprites[0] }
}

describe('SpriteEditState', () => {
  it('reopens the same editing draft independently of sprite generation', () => {
    const { i18n, project, state, source } = setup()
    const generations = new GenState(i18n, project)
    onTestFinished(() => generations.dispose())
    const gen = new SpriteGen(i18n, project, { settings: { name: source.name } })
    generations.addSprite(gen)

    const edit = state.start(source)
    edit.setCostumeInstruction(edit.costumes[0].id, 'Make the hat red')
    expect(state.start(source)).toBe(edit)
    expect(state.edits).toEqual([edit])
    expect(generations.sprites).toEqual([gen])
    expect(edit.previewSprite).not.toBe(source)
  })

  it('finishes a fully adopted draft and reopens from the current project resources', async () => {
    const { state, source } = setup()
    const edit = state.start(source)
    const costume = edit.costumes[0]
    expect(edit.hasPendingChanges).toBe(false)
    costume.setName('renamed')
    await nextTick()
    expect(edit.hasPendingChanges).toBe(true)
    edit.applyToSprite(source, { type: 'costume', id: costume.id })
    expect(edit.hasPendingChanges).toBe(false)
    state.finish(edit)
    expect(state.edits).toEqual([])
    expect(edit.isDisposed).toBe(true)

    source.costumes[0].setName('changed-in-project')
    const reopened = state.start(source)
    expect(reopened.costumes[0].name).toBe('changed-in-project')
    expect(state.export()).toEqual({})
    await state.load(sndFiles(reopened.export()))
    expect(state.edits).toEqual([])
  })

  it('keeps the editing session open after adopting one resource', async () => {
    const { state, source } = setup()
    const edit = state.start(source)
    const costume = edit.costumes[0]
    edit.editHistory.record(costume)
    costume.setName('renamed')
    edit.setAnimationInstruction(edit.animations[0].id, 'Blue coat')
    await nextTick()
    edit.applyToSprite(source, { type: 'costume', id: costume.id })

    expect(source.costumes[0].name).toBe('renamed')
    expect(state.start(source)).toBe(edit)
    expect(edit.editHistory.canUndo(costume.id)).toBe(false)
    expect(edit.getAnimationInstruction(edit.animations[0].id)).toBe('Blue coat')
    expect(edit.isDisposed).toBe(false)
  })

  it('removes orphaned drafts when their source sprite is removed', async () => {
    const { project, state, source } = setup()
    const edit = state.start(source)
    const cancel = vi.spyOn(edit, 'cancel')
    project.removeSprite(source.id)
    await nextTick()

    expect(cancel).toHaveBeenCalledOnce()
    expect(edit.isDisposed).toBe(true)
    expect(state.edits).toEqual([])
  })

  it('retains drafts when project loading replaces the source with the same ID', async () => {
    const { project, state, source } = setup()
    const edit = state.start(source)
    await project.loadFiles(project.exportFiles())
    await nextTick()

    expect(project.sprites[0]).not.toBe(source)
    expect(project.sprites[0].id).toBe(source.id)
    expect(state.edits).toEqual([edit])
    expect(edit.isDisposed).toBe(false)
  })

  it('restores editing instructions separately from generation tasks', async () => {
    const { i18n, project, state, source } = setup()
    const edit = state.start(source)
    edit.setCostumeInstruction(edit.costumes[0].id, 'Make the hat red')
    const files = sndFiles(state.export())
    const generations = new GenState(i18n, project)
    onTestFinished(() => generations.dispose())

    await Promise.all([state.load(files), generations.load(files)])
    expect(generations.sprites).toEqual([])
    expect(state.edits).toHaveLength(1)
    const restored = state.edits[0]
    expect(restored.sourceSpriteId).toBe(source.id)
    expect(restored.getCostumeInstruction(restored.costumes[0].id)).toBe('Make the hat red')
    expect(restored.costumes[0].image).toBe(restored.costumes[0].result?.img)
    expect(edit.isDisposed).toBe(true)
  })
})

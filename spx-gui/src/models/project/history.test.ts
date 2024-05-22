import { describe, it, expect } from 'vitest'
import { fromText } from '../common/file'
import { Costume } from '../costume'
import { Sprite } from '../sprite'
import { Project } from '.'
import { History } from './history'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

describe('History', () => {
  it('should work well', async () => {
    const project = new Project()
    const sprite = new Sprite('Sprite')
    const file1 = mockFile()
    const costume = new Costume('costume', file1)
    sprite.addCostume(costume)
    project.addSprite(sprite)
    const history = new History(project)
    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBeNull()

    await history.doAction({ en: 'rename costume', zh: 'rename costume' }, () => {
      project.sprites[0].costumes[0].setName('costume2')
    })

    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()?.name.en).toBe('rename costume')
    expect(project.sprites[0].costumes[0].name).toBe('costume2')

    await history.undo()
    expect(history.getRedoAction()?.name.en).toBe('rename costume')
    expect(history.getUndoAction()).toBeNull()
    expect(project.sprites[0].costumes[0].name).toBe('costume')

    await history.doAction({ en: 'rename sprite', zh: 'rename sprite' }, () => {
      project.sprites[0].setName('Sprite2')
    })

    await history.doAction({ en: 'add costume', zh: 'add costume' }, async () => {
      const file2 = mockFile()
      const costume2 = new Costume('costume2', file2)
      project.sprites[0].addCostume(costume2)
      await sleep(100)
      costume2.setName('costume_2')
    })

    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()?.name.en).toBe('add costume')
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes[1].name).toBe('costume_2')

    await history.undo()
    expect(history.getRedoAction()?.name.en).toBe('add costume')
    expect(history.getUndoAction()?.name.en).toBe('rename sprite')
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes).toHaveLength(1)

    await history.redo()
    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()?.name.en).toBe('add costume')
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes[1].name).toBe('costume_2')

    await history.undo()
    await history.undo()
    expect(history.getRedoAction()?.name.en).toBe('rename sprite')
    expect(history.getUndoAction()).toBeNull()
    expect(project.sprites[0].costumes[0].name).toBe('costume')

    await history.redo()
    expect(history.getRedoAction()?.name.en).toBe('add costume')
    expect(history.getUndoAction()?.name.en).toBe('rename sprite')
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes).toHaveLength(1)
  })
})

export function sleep(duration = 1000) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), duration))
}

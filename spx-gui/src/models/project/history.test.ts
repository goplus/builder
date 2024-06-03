import { describe, it, expect } from 'vitest'
import { sleep } from '@/utils/test'
import { fromText } from '../common/file'
import { Costume } from '../costume'
import { Sprite } from '../sprite'
import { Project } from '.'
import { History, type Action } from './history'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

const actionRenameCostume: Action = {
  name: { en: 'rename costume', zh: '重命名造型' }
}

const actionRenameSprite: Action = {
  name: { en: 'rename sprite', zh: '重命名精灵' }
}

const actionAddCostume: Action = {
  name: { en: 'add costume', zh: '添加造型' }
}

const actionUpdateCode: Action = {
  name: { en: 'update code', zh: '更新代码' },
  mergeable: true
}

function makeProject() {
  const project = new Project()
  const sprite = new Sprite('Sprite')
  const file1 = mockFile()
  const costume = new Costume('costume', file1)
  sprite.addCostume(costume)
  project.addSprite(sprite)
  return project
}

describe('History', () => {
  it('should work well', async () => {
    const project = makeProject()
    const history = new History(project)
    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBeNull()

    await history.doAction(actionRenameCostume, () => {
      project.sprites[0].costumes[0].setName('costume2')
    })

    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionRenameCostume)
    expect(project.sprites[0].costumes[0].name).toBe('costume2')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionRenameCostume)
    expect(history.getUndoAction()).toBeNull()
    expect(project.sprites[0].costumes[0].name).toBe('costume')

    await history.doAction(actionRenameSprite, () => {
      project.sprites[0].setName('Sprite2')
    })

    await history.doAction(actionAddCostume, async () => {
      const file2 = mockFile()
      const costume2 = new Costume('costume2', file2)
      project.sprites[0].addCostume(costume2)
      await sleep(100)
      costume2.setName('costume_2')
    })

    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionAddCostume)
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes[1].name).toBe('costume_2')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionAddCostume)
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes).toHaveLength(1)

    await history.redo()
    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionAddCostume)
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes[1].name).toBe('costume_2')

    await history.undo()
    await history.undo()
    expect(history.getRedoAction()).toBe(actionRenameSprite)
    expect(history.getUndoAction()).toBeNull()
    expect(project.sprites[0].costumes[0].name).toBe('costume')

    await history.redo()
    expect(history.getRedoAction()).toBe(actionAddCostume)
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite2')
    expect(project.sprites[0].costumes).toHaveLength(1)
  })

  it('should work well with mergable actions', async () => {
    const project = makeProject()
    const history = new History(project)

    await history.doAction(actionUpdateCode, () => {
      project.sprites[0].setCode('code')
    })

    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionUpdateCode)
    expect(await project.sprites[0].getCode()).toBe('code')

    await history.doAction(actionUpdateCode, () => {
      project.sprites[0].setCode('code2')
    })

    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionUpdateCode)
    expect(await project.sprites[0].getCode()).toBe('code2')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionUpdateCode)
    expect(history.getUndoAction()).toBeNull()
    expect(await project.sprites[0].getCode()).toBe('')

    await history.redo()
    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionUpdateCode)
    expect(await project.sprites[0].getCode()).toBe('code2')
  })

  it('should work well with concurrent actions', async () => {
    const project = makeProject()
    const history = new History(project)

    const promise1 = history.doAction(actionRenameSprite, async () => {
      project.sprites[0].setName('Sprite1_1')
      await sleep(100)
      project.sprites[0].setName('Sprite1_2')
    })

    const promise2 = history.doAction(actionRenameSprite, async () => {
      project.sprites[0].setName('Sprite2_1')
      await sleep(100)
      project.sprites[0].setName('Sprite2_2')
      await sleep(100)
      project.sprites[0].setName('Sprite2_3')
    })

    const promise3 = history.doAction(actionRenameSprite, async () => {
      project.sprites[0].setName('Sprite3_1')
      await sleep(100)
      project.sprites[0].setName('Sprite3_2')
    })

    await Promise.all([promise1, promise2, promise3])
    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite3_2')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionRenameSprite)
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite2_3')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionRenameSprite)
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite1_2')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionRenameSprite)
    expect(history.getUndoAction()).toBeNull()
    expect(project.sprites[0].name).toBe('Sprite')
  })

  it('should work well with max history length', async () => {
    const project = makeProject()
    const history = new History(project, 2)

    for (let i = 0; i < 3; i++) {
      await history.doAction(actionRenameSprite, () => {
        project.sprites[0].setName(`Sprite${i + 1}`)
      })
    }

    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite3')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionRenameSprite)
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite2')

    await history.undo()
    expect(history.getRedoAction()).toBe(actionRenameSprite)
    expect(history.getUndoAction()).toBeNull()
    expect(project.sprites[0].name).toBe('Sprite1')

    await history.redo()
    expect(history.getRedoAction()).toBe(actionRenameSprite)
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite2')

    await history.redo()
    expect(history.getRedoAction()).toBeNull()
    expect(history.getUndoAction()).toBe(actionRenameSprite)
    expect(project.sprites[0].name).toBe('Sprite3')
  })
})

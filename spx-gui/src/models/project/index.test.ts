import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { Sprite } from '../sprite'
import { Animation } from '../animation'
import { Sound } from '../sound'
import { Costume } from '../costume'
import { fromText, type Files } from '../common/file'
import { AutoSaveMode, AutoSaveToCloudState, Project } from '.'
import * as cloudHelper from '../common/cloud'
import * as localHelper from '../common/local'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeProject() {
  const project = new Project()
  const sprite = new Sprite('Sprite')
  const costume = new Costume('default', mockFile())
  sprite.addCostume(costume)
  const animationCostumes = Array.from({ length: 3 }, (_, i) => new Costume(`a${i}`, mockFile()))
  const animation = Animation.create('default', animationCostumes)
  sprite.addAnimation(animation)
  const sound = new Sound('sound', mockFile())
  project.addSprite(sprite)
  project.addSound(sound)
  return project
}

describe('Project', () => {
  it('should preserve animation sound with exportGameFiles & loadGameFiles', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].name)

    const files = project.exportGameFiles()
    await project.loadGameFiles(files)
    expect(project.sprites[0].animations[0].sound).toBe(project.sounds[0].name)
  })

  it('should preserve order for sprites & sounds however files are sorted', async () => {
    const project = makeProject()

    project.sprites[0].setName('Sprite1')
    const sprite3 = new Sprite('Sprite3')
    project.addSprite(sprite3)
    const sprite2 = new Sprite('Sprite2')
    project.addSprite(sprite2)

    project.sounds[0].setName('sound1')
    const sound3 = new Sound('sound3', mockFile())
    project.addSound(sound3)
    const sound2 = new Sound('sound2', mockFile())
    project.addSound(sound2)

    const files = project.exportGameFiles()

    const reversedFiles = Object.keys(files)
      .reverse()
      .reduce<Files>((acc, key) => {
        acc[key] = files[key]
        return acc
      }, {})
    await project.loadGameFiles(reversedFiles)
    expect(project.sprites.map((s) => s.name)).toEqual(['Sprite1', 'Sprite3', 'Sprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])

    const shuffledFiles = Object.keys(files)
      .sort(() => Math.random() - 0.5)
      .reduce<Files>((acc, key) => {
        acc[key] = files[key]
        return acc
      }, {})
    await project.loadGameFiles(shuffledFiles)
    expect(project.sprites.map((s) => s.name)).toEqual(['Sprite1', 'Sprite3', 'Sprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])
  })

  it('should select correctly after sound removed', async () => {
    const project = makeProject()
    const sprite2 = new Sprite('Sprite2')
    project.addSprite(sprite2)
    const sound2 = new Sound('sound2', mockFile())
    project.addSound(sound2)
    const sound3 = new Sound('sound3', mockFile())
    project.addSound(sound3)

    project.select({ type: 'stage' })
    project.removeSound('sound3')
    expect(project.selected).toEqual({ type: 'stage' })

    project.select({ type: 'sound', name: 'sound' })

    project.removeSound('sound')
    expect(project.selected).toEqual({
      type: 'sound',
      name: 'sound2'
    })

    project.removeSound('sound2')
    expect(project.selected).toEqual({
      type: 'sprite',
      name: 'Sprite'
    })
  })

  it('should select correctly after sprite removed', async () => {
    const project = makeProject()
    const sprite2 = new Sprite('Sprite2')
    project.addSprite(sprite2)
    const sprite3 = new Sprite('Sprite3')
    project.addSprite(sprite3)

    project.select({ type: 'stage' })
    project.removeSprite('Sprite3')
    expect(project.selected).toEqual({ type: 'stage' })

    project.select({ type: 'sprite', name: 'Sprite' })

    project.removeSprite('Sprite')
    expect(project.selected).toEqual({
      type: 'sprite',
      name: 'Sprite2'
    })

    project.removeSprite('Sprite2')
    expect(project.selected).toBeNull()
  })

  it('should throw an error when saving a disposed project', async () => {
    const project = makeProject()
    const saveToLocalCacheMethod = vi.spyOn(project, 'saveToLocalCache' as any)

    project.dispose()

    await expect(project.saveToCloud()).rejects.toThrow('disposed')

    await expect((project as any).saveToLocalCache('key')).rejects.toThrow('disposed')
    expect(saveToLocalCacheMethod).toHaveBeenCalledWith('key')
  })
})

describe('ProjectAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // https://github.com/goplus/builder/pull/794#discussion_r1728120369
  it('should handle failed auto-save correctly', async () => {
    const project = makeProject()

    const cloudSaveMock = vi.spyOn(cloudHelper, 'save').mockRejectedValue(new Error('save failed'))
    const localSaveMock = vi.spyOn(localHelper, 'save').mockResolvedValue(undefined)
    const localClearMock = vi.spyOn(localHelper, 'clear').mockResolvedValue(undefined)

    await project.startEditing('localCacheKey')
    project.setAutoSaveMode(AutoSaveMode.Cloud)

    const newSprite = new Sprite('newSprite')
    project.addSprite(newSprite)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000) // wait for changes to be picked up
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Pending)
    expect(project.hasUnsyncedChanges).toBe(true)

    await vi.advanceTimersByTimeAsync(1500) // wait for auto-save to trigger
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Failed)
    expect(project.hasUnsyncedChanges).toBe(true)
    expect(cloudSaveMock).toHaveBeenCalledTimes(1)
    expect(localSaveMock).toHaveBeenCalledTimes(1)

    project.removeSprite(newSprite.name)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000) // wait for changes to be picked up
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Failed)
    expect(project.hasUnsyncedChanges).toBe(false)

    await vi.advanceTimersByTimeAsync(5000) // wait for auto-retry to trigger
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Saved)
    expect(project.hasUnsyncedChanges).toBe(false)
    expect(cloudSaveMock).toHaveBeenCalledTimes(1)
    expect(localSaveMock).toHaveBeenCalledTimes(1)
    expect(localClearMock).toHaveBeenCalledTimes(1)
  })

  it('should cancel pending auto-save-to-cloud when project is disposed', async () => {
    const project = makeProject()

    const cloudSaveMock = vi.spyOn(cloudHelper, 'save').mockRejectedValue(undefined)

    await project.startEditing('localCacheKey')
    project.setAutoSaveMode(AutoSaveMode.Cloud)

    const newSprite = new Sprite('newSprite')
    project.addSprite(newSprite)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000) // wait for changes to be picked up
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Pending)
    expect(project.hasUnsyncedChanges).toBe(true)

    project.dispose()

    await vi.advanceTimersByTimeAsync(1500 * 2) // wait longer to ensure auto-save does not trigger
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Pending)
    expect(project.hasUnsyncedChanges).toBe(true)
    expect(cloudSaveMock).toHaveBeenCalledTimes(0)
  })

  it('should cancel pending auto-save-to-local-cache when project is disposed', async () => {
    const project = makeProject()

    const localSaveMock = vi.spyOn(localHelper, 'save').mockResolvedValue(undefined)

    await project.startEditing('localCacheKey')
    project.setAutoSaveMode(AutoSaveMode.LocalCache)

    const newSprite = new Sprite('newSprite')
    project.addSprite(newSprite)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000) // wait for changes to be picked up
    await flushPromises()
    expect(project.hasUnsyncedChanges).toBe(true)

    project.dispose()

    await vi.advanceTimersByTimeAsync(1000 * 2) // wait longer to ensure auto-save does not trigger
    await flushPromises()
    expect(project.hasUnsyncedChanges).toBe(true)
    expect(localSaveMock).toHaveBeenCalledTimes(0)
  })
})

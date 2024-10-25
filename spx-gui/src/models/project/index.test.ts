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
import type { ProjectData } from '@/apis/project'
import { Cancelled } from '@/utils/exception'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeProject() {
  const project = new Project()
  const sound = new Sound('sound', mockFile())
  project.addSound(sound)

  const sprite = new Sprite('Sprite')
  const costume = new Costume('default', mockFile())
  sprite.addCostume(costume)
  const animationCostumes = Array.from({ length: 3 }, (_, i) => new Costume(`a${i}`, mockFile()))
  const animation = Animation.create('default', animationCostumes)
  sprite.addAnimation(animation)
  project.addSprite(sprite)
  project.bindScreenshotTaker(async () => mockFile())
  return project
}

describe('Project', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should preserve animation sound with exportGameFiles & loadGameFiles', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].id)

    const files = project.exportGameFiles()
    await project.loadGameFiles(files)
    expect(project.sprites[0].animations[0].sound).toBe(project.sounds[0].id)
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
    project.removeSound(sound3.id)
    expect(project.selected).toEqual({ type: 'stage' })

    project.select({ type: 'sound', id: project.sounds[0].id })

    project.removeSound(project.sounds[0].id)
    const sound2Id = project.sounds.find((s) => s.name === 'sound2')?.id
    expect(sound2Id).toBeTruthy()
    expect(sound2Id).toEqual(sound2.id)
    expect(project.selected).toEqual({
      type: 'sound',
      id: sound2Id
    })

    project.removeSound(sound2.id)

    const spriteId = project.sprites.find((s) => s.name === 'Sprite')?.id
    expect(spriteId).toBeTruthy()
    expect(project.selected).toEqual({
      type: 'sprite',
      id: spriteId
    })
  })

  it('should select correctly after sprite removed', async () => {
    const project = makeProject()
    const sprite2 = new Sprite('Sprite2')
    project.addSprite(sprite2)
    const sprite3 = new Sprite('Sprite3')
    project.addSprite(sprite3)

    project.select({ type: 'stage' })
    project.removeSprite(sprite3.id)
    expect(project.selected).toEqual({ type: 'stage' })

    project.select({ type: 'sprite', id: project.sprites[0].id })

    project.removeSprite(project.sprites[0].id)
    const nextId: string = (project.selected as any).id
    expect(nextId).toBeTruthy()
    expect(nextId).toEqual(project.sprites.find((s) => s.name === 'Sprite2')?.id)

    project.removeSprite(sprite2.id)
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

  it('should abort previous saveToCloud call when a new one is initiated', async () => {
    const project = makeProject()

    vi.spyOn(cloudHelper, 'saveFile').mockImplementation(async () => 'data:;,')

    const cloudSaveMock = vi
      .spyOn(cloudHelper, 'save')
      .mockImplementation((metadata, files, signal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve({ metadata: metadata as ProjectData, files })
          }, 1000)

          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId)
              reject(signal.reason)
            })
          }
        })
      })

    const firstSavePromise = project.saveToCloud()
    await vi.advanceTimersByTimeAsync(500)

    const secondSavePromise = project.saveToCloud()
    vi.runOnlyPendingTimersAsync()

    await expect(firstSavePromise).rejects.toThrow(Cancelled)
    await expect(secondSavePromise).resolves.not.toThrow()
    expect(cloudSaveMock).toHaveBeenCalledTimes(2)
  })

  it('should not abort saveToCloud call if it completes before a new one is initiated', async () => {
    const project = makeProject()

    vi.spyOn(cloudHelper, 'saveFile').mockImplementation(async () => 'data:;,')

    const cloudSaveMock = vi.spyOn(cloudHelper, 'save').mockImplementation((metadata, files) => {
      return new Promise((resolve) => {
        resolve({ metadata: metadata as ProjectData, files })
      })
    })

    const firstSavePromise = project.saveToCloud()
    await expect(firstSavePromise).resolves.not.toThrow()

    const secondSavePromise = project.saveToCloud()
    await expect(secondSavePromise).resolves.not.toThrow()

    expect(cloudSaveMock).toHaveBeenCalledTimes(2)
  })

  // https://github.com/goplus/builder/pull/794#discussion_r1728120369
  it('should handle failed auto-save-to-cloud correctly', async () => {
    vi.spyOn(cloudHelper, 'saveFile').mockImplementation(async () => 'data:;,')
    const cloudSaveMock = vi.spyOn(cloudHelper, 'save').mockRejectedValue(new Error('save failed'))
    const localSaveMock = vi.spyOn(localHelper, 'save').mockResolvedValue(undefined)
    const localClearMock = vi.spyOn(localHelper, 'clear').mockResolvedValue(undefined)

    const project = makeProject()

    project.setAutoSaveMode(AutoSaveMode.Cloud)
    project['startAutoSaveToCloud']('localCacheKey')
    await flushPromises() // flush immediate watchers
    const autoSaveToCloud = project['autoSaveToCloud']
    expect(autoSaveToCloud).toBeTruthy()

    project['filesHash'] = 'newHash'
    project['lastSyncedFilesHash'] = 'hash'
    expect(project.hasUnsyncedChanges).toBe(true)

    autoSaveToCloud?.()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Pending)
    expect(project.hasUnsyncedChanges).toBe(true)

    await vi.runOnlyPendingTimersAsync()
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Failed)
    expect(project.hasUnsyncedChanges).toBe(true)
    expect(cloudSaveMock).toHaveBeenCalledTimes(1)
    expect(localSaveMock).toHaveBeenCalledTimes(1)

    project['lastSyncedFilesHash'] = project['filesHash']
    expect(project.hasUnsyncedChanges).toBe(false)

    await vi.runOnlyPendingTimersAsync()
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Saved)
    expect(project.hasUnsyncedChanges).toBe(false)
    expect(cloudSaveMock).toHaveBeenCalledTimes(1)
    expect(localSaveMock).toHaveBeenCalledTimes(1)
    expect(localClearMock).toHaveBeenCalledTimes(1)
  })

  it('should cancel pending auto-save-to-cloud when project is disposed', async () => {
    const cloudSaveMock = vi.spyOn(cloudHelper, 'save').mockRejectedValue(undefined)

    const project = makeProject()

    project.setAutoSaveMode(AutoSaveMode.Cloud)
    project['startAutoSaveToCloud']('localCacheKey')
    await flushPromises() // flush immediate watchers
    const autoSaveToCloud = project['autoSaveToCloud']
    expect(autoSaveToCloud).toBeTruthy()

    project['filesHash'] = 'newHash'
    project['lastSyncedFilesHash'] = 'hash'
    expect(project.hasUnsyncedChanges).toBe(true)

    autoSaveToCloud?.()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Pending)
    expect(project.hasUnsyncedChanges).toBe(true)

    project.dispose()
    await vi.runOnlyPendingTimersAsync()
    await flushPromises()
    expect(project.autoSaveToCloudState).toBe(AutoSaveToCloudState.Pending)
    expect(project.hasUnsyncedChanges).toBe(true)
    expect(cloudSaveMock).toHaveBeenCalledTimes(0)
  })

  it('should cancel pending auto-save-to-local-cache when project is disposed', async () => {
    const localSaveMock = vi.spyOn(localHelper, 'save').mockResolvedValue(undefined)

    const project = makeProject()

    project.setAutoSaveMode(AutoSaveMode.LocalCache)
    project['startAutoSaveToLocalCache']('localCacheKey')
    await flushPromises() // flush immediate watchers
    const autoSaveToLocalCache = project['autoSaveToLocalCache']
    expect(autoSaveToLocalCache).toBeTruthy()

    autoSaveToLocalCache?.()

    project.dispose()
    await vi.runOnlyPendingTimersAsync()
    await flushPromises()
    expect(localSaveMock).toHaveBeenCalledTimes(0)
  })
})

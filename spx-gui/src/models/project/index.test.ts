import { describe, it, expect, vi } from 'vitest'
import { Sprite } from '../sprite'
import { Animation } from '../animation'
import { Sound } from '../sound'
import { Costume } from '../costume'
import { fromText, toConfig, type Files } from '../common/file'
import * as hashHelper from '../common/hash'
import { Backdrop } from '../backdrop'
import { Monitor } from '../widget/monitor'
import { Project, projectConfigFilePath, type RawProjectConfig } from '.'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeProject() {
  const project = new Project()
  const sound = new Sound('sound', mockFile())
  project.addSound(sound)

  const backdrop = new Backdrop('backdrop', mockFile())
  project.stage.addBackdrop(backdrop)
  const widget = new Monitor('monitor', {
    x: 10,
    y: 20,
    label: 'Score',
    variableName: 'score'
  })
  project.stage.addWidget(widget)

  const sprite = new Sprite('MySprite')
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

    project.sprites[0].setName('MySprite1')
    const sprite3 = new Sprite('MySprite3')
    project.addSprite(sprite3)
    const sprite2 = new Sprite('MySprite2')
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
    expect(project.sprites.map((s) => s.name)).toEqual(['MySprite1', 'MySprite3', 'MySprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])

    const shuffledFiles = Object.keys(files)
      .sort(() => Math.random() - 0.5)
      .reduce<Files>((acc, key) => {
        acc[key] = files[key]
        return acc
      }, {})
    await project.loadGameFiles(shuffledFiles)
    expect(project.sprites.map((s) => s.name)).toEqual(['MySprite1', 'MySprite3', 'MySprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])
  })

  it('should throw an error when saving a disposed project', async () => {
    const project = makeProject()
    const saveToLocalCacheMethod = vi.spyOn(project, 'saveToLocalCache' as any)

    project.dispose()

    await expect(project.saveToCloud()).rejects.toThrow('disposed')

    await expect((project as any).saveToLocalCache('key')).rejects.toThrow('disposed')
    expect(saveToLocalCacheMethod).toHaveBeenCalledWith('key')
  })

  it('should preserve information after export & load', async () => {
    const project = makeProject()
    const files = project.exportGameFiles()
    const hash = await hashHelper.hashFiles(files)
    await project.loadGameFiles(files)
    const files2 = project.exportGameFiles()
    const hash2 = await hashHelper.hashFiles(files2)
    expect(hash).toBe(hash2)
  })

  it('should move sprites correctly', async () => {
    const project = new Project()
    const sprite1 = new Sprite('sprite1')
    const sprite2 = new Sprite('sprite2')
    const sprite3 = new Sprite('sprite3')
    project.addSprite(sprite1)
    project.addSprite(sprite2)
    project.addSprite(sprite3)
    expect(project.sprites.map((s) => s.name)).toEqual(['sprite1', 'sprite2', 'sprite3'])
    expect(project.zorder).toEqual([sprite1.id, sprite2.id, sprite3.id])
    project.moveSprite(0, 1)
    expect(project.sprites.map((s) => s.name)).toEqual(['sprite2', 'sprite1', 'sprite3'])
    expect(project.zorder).toEqual([sprite1.id, sprite2.id, sprite3.id])
    project.moveSprite(2, 0)
    expect(project.sprites.map((s) => s.name)).toEqual(['sprite3', 'sprite2', 'sprite1'])
    expect(project.zorder).toEqual([sprite1.id, sprite2.id, sprite3.id])
  })

  it('should move sounds correctly', async () => {
    const project = new Project()
    const sound1 = new Sound('sound1', mockFile())
    const sound2 = new Sound('sound2', mockFile())
    const sound3 = new Sound('sound3', mockFile())
    project.addSound(sound1)
    project.addSound(sound2)
    project.addSound(sound3)
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound2', 'sound3'])
    project.moveSound(0, 1)
    expect(project.sounds.map((s) => s.name)).toEqual(['sound2', 'sound1', 'sound3'])
    project.moveSound(2, 0)
    expect(project.sounds.map((s) => s.name)).toEqual(['sound3', 'sound2', 'sound1'])
  })

  it('should audio attenuation be enabled when map size exceeds viewport size', async () => {
    const project = new Project()
    const stage = project.stage
    const viewport = project.viewportSize

    async function reloadProjectConfig() {
      const exports = project.exportGameFiles()
      return toConfig(exports[projectConfigFilePath]!) as RawProjectConfig
    }

    // initial map size equals to viewport size, so audio attenuation is disabled
    expect(stage.getMapSize()).toEqual(viewport)
    let projectConfig = await reloadProjectConfig()
    expect(projectConfig.audioAttenuation).toBe(0)

    // increase map width and height, audio attenuation should be enabled
    stage.setMapWidth(viewport.width + 100)
    stage.setMapHeight(viewport.height)
    projectConfig = await reloadProjectConfig()
    expect(projectConfig.audioAttenuation).toBe(1)

    // increase map width and height, audio attenuation should still be enabled
    stage.setMapWidth(viewport.width + 100)
    stage.setMapHeight(viewport.height + 200)
    projectConfig = await reloadProjectConfig()
    expect(projectConfig.audioAttenuation).toBe(1)

    // reset map size to equal to viewport size, audio attenuation should be disabled
    stage.setMapWidth(viewport.width)
    stage.setMapHeight(viewport.height)
    projectConfig = await reloadProjectConfig()
    expect(projectConfig.audioAttenuation).toBe(0)

    // increase map height, audio attenuation should be enabled
    stage.setMapHeight(viewport.height + 200)
    projectConfig = await reloadProjectConfig()
    expect(projectConfig.audioAttenuation).toBe(1)
  })

  it('should add sprite after correctly', () => {
    const project = new Project()
    const sprite1 = new Sprite('sprite1')
    project.addSprite(sprite1)

    const sprite2 = new Sprite('sprite2')
    project.addSpriteAfter(sprite2, sprite1.id)
    expect(project.sprites.map((s) => s.id)).toEqual([sprite1.id, sprite2.id])

    const sprite3 = new Sprite('sprite3')
    project.addSpriteAfter(sprite3, sprite1.id)
    expect(project.sprites.map((s) => s.id)).toEqual([sprite1.id, sprite3.id, sprite2.id])
  })

  it('should add sound after correctly', () => {
    const project = makeProject()
    const sound1 = project.sounds[0]

    const sound2 = new Sound('sound2', mockFile())
    project.addSoundAfter(sound2, sound1.id)
    expect(project.sounds.map((s) => s.id)).toEqual([sound1.id, sound2.id])

    const sound3 = new Sound('sound3', mockFile())
    project.addSoundAfter(sound3, sound1.id)
    expect(project.sounds.map((s) => s.id)).toEqual([sound1.id, sound3.id, sound2.id])
  })
})

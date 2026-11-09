import { describe, it, expect, vi } from 'vitest'
import { TimeoutException } from '@/utils/exception'
import { ProjectType } from '@/apis/project'
import { History } from '@/components/editor/history'
import { Sprite, State } from './sprite'
import { Animation } from './animation'
import { Sound } from './sound'
import { Costume } from './costume'
import { fromConfig, fromText, toConfig, type Files } from '../common/file'
import * as hashHelper from '../common/hash'
import { Backdrop } from './backdrop'
import { Monitor } from './widget/monitor'
import { SpxProject, projectConfigFilePath, type RawProjectConfig, type ScreenshotTaker } from './project'
import { FontFamily } from './font'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeProject(screenshotTaker: ScreenshotTaker | null = async () => mockFile()) {
  const project = new SpxProject()
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
  if (screenshotTaker != null) project.bindScreenshotTaker(screenshotTaker)
  return project
}

describe('Project', () => {
  it('should restore persisted asset names and references without interactive corrections', async () => {
    const longName = 'a'.repeat(101)
    const spriteName = 'not an identifier'
    const files: Files = {
      [projectConfigFilePath]: fromConfig('index.json', {
        backdrops: [{ name: '', path: 'blank.png', x: 0, y: 0 }],
        backdropIndex: 0,
        camera: { on: spriteName },
        zorder: [spriteName, { type: 'monitor', name: longName, mode: 1, val: 'score' }],
        fontPreferences: ['default']
      }),
      'assets/blank.png': mockFile('blank.png'),
      [`assets/sprites/${spriteName}/index.json`]: fromConfig('index.json', {
        builder_id: 'sprite-id',
        costumes: [
          { name: '', path: 'blank.png' },
          { name: longName, path: 'long.png' },
          { name: '__animation__', path: 'frame.png' }
        ],
        costumeIndex: 0,
        fAnimations: { '': { frameFrom: '__animation__', frameTo: '__animation__', onStart: { play: longName } } },
        defaultAnimation: '',
        animBindings: { die: '' }
      }),
      [`assets/sprites/${spriteName}/blank.png`]: mockFile('blank.png'),
      [`assets/sprites/${spriteName}/long.png`]: mockFile('long.png'),
      [`assets/sprites/${spriteName}/frame.png`]: mockFile('frame.png'),
      [`assets/sounds/${longName}/index.json`]: fromConfig('index.json', { path: 'sound.wav' }),
      [`assets/sounds/${longName}/sound.wav`]: mockFile('sound.wav')
    }
    const project = new SpxProject()
    await project.loadFiles(files)

    const assertRestored = () => {
      const sprite = project.sprites[0]
      const animation = sprite.animations[0]
      const sound = project.sounds[0]
      const stage = project.stage
      expect(sprite.name).toBe(spriteName)
      expect(sprite.project).toBe(project)
      expect(sprite.costumes.map((c) => c.name)).toEqual(['', longName])
      expect(sprite.costumes.every((c) => c.parent === sprite)).toBe(true)
      expect(sprite.defaultCostume).toBe(sprite.costumes[0])
      expect(animation.name).toBe('')
      expect(animation.sprite).toBe(sprite)
      expect(animation.costumes[0].name).toBe('')
      expect(animation.costumes[0].parent).toBe(animation)
      expect(sprite.getAnimationBoundStates(animation.id)).toEqual([State.Default, State.Die])
      expect(animation.sound).toBe(sound.id)
      expect(sound.name).toBe(longName)
      expect(sound._project).toBe(project)
      expect(project.cameraFollowSprite).toBe(sprite)
      expect(project.zorder).toEqual([sprite.id])
      expect(stage.defaultBackdrop?.name).toBe('')
      expect(stage.backdrops[0].stage).toBe(stage)
      expect(stage.widgets[0].name).toBe(longName)
      expect(stage.widgets[0].stage).toBe(stage)
      expect(stage.widgetsZorder).toEqual([stage.widgets[0].id])
    }
    assertRestored()
    const exported = project.exportFiles()
    const hash = await hashHelper.hashFiles(exported)
    await project.loadFiles(exported)
    assertRestored()
    expect(await hashHelper.hashFiles(project.exportFiles())).toBe(hash)

    const history = new History(project)
    await history.doAction({ name: { en: 'Move sprite', zh: '移动精灵' } }, () => project.sprites[0].setX(20))
    await history.undo()
    assertRestored()
    await history.redo()
    assertRestored()
    expect(project.sprites[0].x).toBe(20)

    const [sprite] = project.sprites
    const [sound] = project.sounds
    const [widget] = project.stage.widgets
    project.removeSprite(sprite.id)
    project.removeSound(sound.id)
    project.stage.removeWidget(widget.id)
    expect(sprite.project).toBeNull()
    expect(sound._project).toBeNull()
    expect(widget.stage).toBeNull()
  })

  it('should restore names when inserting assets after a reference', () => {
    const project = makeProject()
    const originalSprite = project.sprites[0]
    const sprite = new Sprite('not an identifier')
    project.addSpriteAfter(sprite, originalSprite.id, true)
    expect(project.sprites[1]).toBe(sprite)
    expect(sprite.name).toBe('not an identifier')
    expect(sprite.project).toBe(project)
    expect(project.zorder).toEqual([originalSprite.id, sprite.id])

    const costume = new Costume('', mockFile())
    originalSprite.addCostumeAfter(costume, originalSprite.costumes[0].id, true)
    expect(originalSprite.costumes[1]).toBe(costume)
    expect(costume.name).toBe('')
    expect(costume.parent).toBe(originalSprite)

    const animation = new Animation('')
    originalSprite.addAnimationAfter(animation, originalSprite.animations[0].id, true)
    expect(originalSprite.animations[1]).toBe(animation)
    expect(animation.name).toBe('')
    expect(animation.sprite).toBe(originalSprite)

    const sound = new Sound('', mockFile())
    project.addSoundAfter(sound, project.sounds[0].id, true)
    expect(project.sounds[1]).toBe(sound)
    expect(sound.name).toBe('')
    expect(sound._project).toBe(project)

    const stage = project.stage
    const backdrop = new Backdrop('', mockFile())
    stage.addBackdropAfter(backdrop, stage.backdrops[0].id, true)
    expect(stage.backdrops[1]).toBe(backdrop)
    expect(backdrop.name).toBe('')
    expect(backdrop.stage).toBe(stage)

    const originalWidget = stage.widgets[0]
    const widget = new Monitor('', { variableName: 'score' })
    stage.addWidgetAfter(widget, originalWidget.id, true)
    expect(stage.widgets[1]).toBe(widget)
    expect(widget.name).toBe('')
    expect(widget.stage).toBe(stage)
    expect(stage.widgetsZorder).toEqual([originalWidget.id, widget.id])
    expect(stage.export()[0].widgets?.map((w) => w.name)).toEqual(['monitor', ''])
  })

  it('should still correct names when interactively adding assets', () => {
    const project = new SpxProject()
    const sprite = new Sprite('not an identifier')
    project.addSprite(sprite)
    expect(sprite.name).toBe('NotAnIdentifier')
    const costume = new Costume('', mockFile())
    sprite.addCostume(costume)
    expect(costume.name).toBe('costume1')
    const duplicate = new Costume('costume1', mockFile())
    sprite.addCostumeAfter(duplicate, costume.id)
    expect(duplicate.name).toBe('costume2')
    const animation = new Animation('')
    sprite.addAnimation(animation)
    expect(animation.name).toBe('animation1')
    const sound = new Sound('', mockFile())
    project.addSound(sound)
    expect(sound.name).toBe('sound1')
    const backdrop = new Backdrop('', mockFile())
    project.stage.addBackdrop(backdrop)
    expect(backdrop.name).toBe('backdrop1')
    const widget = new Monitor('', { variableName: 'score' })
    project.stage.addWidget(widget)
    expect(widget.name).toBe('widget1')
  })

  it('should preserve animation sound with exportGameFiles & loadGameFiles', async () => {
    const project = makeProject()
    const sprite = project.sprites[0]
    const animation = sprite.animations[0]
    animation.setSound(project.sounds[0].id)

    const files = project.exportFiles()
    await project.loadFiles(files)
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

    const files = project.exportFiles()

    const reversedFiles = Object.keys(files)
      .reverse()
      .reduce<Files>((acc, key) => {
        acc[key] = files[key]
        return acc
      }, {})
    await project.loadFiles(reversedFiles)
    expect(project.sprites.map((s) => s.name)).toEqual(['MySprite1', 'MySprite3', 'MySprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])

    const shuffledFiles = Object.keys(files)
      .sort(() => Math.random() - 0.5)
      .reduce<Files>((acc, key) => {
        acc[key] = files[key]
        return acc
      }, {})
    await project.loadFiles(shuffledFiles)
    expect(project.sprites.map((s) => s.name)).toEqual(['MySprite1', 'MySprite3', 'MySprite2'])
    expect(project.sounds.map((s) => s.name)).toEqual(['sound1', 'sound3', 'sound2'])
  })

  it('should preserve information after export & load', async () => {
    const project = makeProject()
    const files = project.exportFiles()
    const hash = await hashHelper.hashFiles(files)
    await project.loadFiles(files)
    const files2 = project.exportFiles()
    const hash2 = await hashHelper.hashFiles(files2)
    expect(hash).toBe(hash2)
  })

  it('should preserve project font collection and preferences', async () => {
    const project = new SpxProject()
    project.setFontPreferences(['basic-chinese', 'default'])
    project.fonts.push(new FontFamily('basic-chinese', fromText('basic-chinese.otf', 'font')))

    const files = project.exportFiles()
    expect(await toConfig(files[projectConfigFilePath]!)).toMatchObject({
      fontPreferences: ['basic-chinese', 'default']
    })
    const loaded = new SpxProject()
    await loaded.loadFiles(files)

    expect(loaded.fontPreferences).toEqual(['basic-chinese', 'default'])
    expect(loaded.fonts.map((font) => font.name)).toEqual(['basic-chinese'])
  })

  it('should reject duplicate font names', () => {
    const project = new SpxProject()
    project.addFont(new FontFamily('custom', mockFile('font-1.otf')))

    expect(() => project.addFont(new FontFamily('custom', mockFile('font-2.otf')))).toThrow(
      'font custom already exists'
    )
  })

  it('should export with existing thumbnail after screenshot taker unbound', async () => {
    const project = makeProject(null)
    const thumbnail = mockFile('thumbnail')
    const unbindScreenshotTaker = project.bindScreenshotTaker(async () => thumbnail)

    // Schedule the debounced update first, then flush it immediately for a deterministic assertion.
    project['updateThumbnail']()
    await project['updateThumbnail'].flush()
    unbindScreenshotTaker()

    const { metadata } = await project.export()
    expect(metadata.type).toBe(ProjectType.Game)
    expect(metadata.thumbnail).toBe(thumbnail)
  })

  it('should stop waiting for screenshot after timeout when exporting', async () => {
    vi.useFakeTimers()
    const project = makeProject(null)
    const signalPromise = new Promise<AbortSignal>((resolve) => {
      project.bindScreenshotTaker((_name, signal) => {
        if (signal == null) throw new Error('abort signal expected')
        resolve(signal)
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason))
        })
      })
    })

    let settled = false
    const exportPromise = project.export().then((result) => {
      settled = true
      return result
    })

    const signal = await signalPromise
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(2999)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(100)
    expect(settled).toBe(true)

    const { metadata } = await exportPromise
    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(TimeoutException)
    expect(metadata.thumbnail).toBeUndefined()
    vi.useRealTimers()
  })

  it('should move sprites correctly', async () => {
    const project = new SpxProject()
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
    const project = new SpxProject()
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
    const project = new SpxProject()
    const stage = project.stage
    const viewport = project.viewportSize

    async function reloadProjectConfig() {
      const exports = project.exportFiles()
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
    const project = new SpxProject()
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

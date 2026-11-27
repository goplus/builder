import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupAigcMock } from './aigc-mock' // Put me before importing `@/apis/aigc` to ensure the mock is set up correctly
import { createI18n } from '@/utils/i18n'
import * as fileHelpers from '@/models/common/file'
import { mockFile } from '../../common/test'
import { makeSpxProject } from '../common/test'
import { Costume } from '../costume'
import { Sprite } from '../sprite'
import { AnimationGen } from './animation-gen'
import { SpriteResourceGen } from './sprite-resource-gen'
import { mockSaveFile } from './test-helpers'

const aigcMock = setupAigcMock()
const i18n = createI18n({ lang: 'en' })
vi.spyOn(fileHelpers, 'getImageSize')

const config = { startTime: 0, duration: 1100, interval: 200 }
const edited = { startTime: 200, duration: 800, interval: 100 }

function setup() {
  const project = makeSpxProject()
  const sprite = Sprite.create('TestSprite', '')
  const costume = new Costume('default', mockFile())
  sprite.addCostume(costume)
  project.addSprite(sprite)
  const gen = new AnimationGen(i18n, sprite, project, {
    settings: { description: 'A walking animation' },
    referenceCostumeId: costume.id
  })
  const draft = new SpriteResourceGen(i18n, project, gen)
  return { gen, draft }
}

function framesOf(version: SpriteResourceGen['versions'][number]) {
  if (version.generation.type !== 'animation') throw new Error('animation version expected')
  return version.generation.config.framesConfig
}

describe('SpriteResourceGen', () => {
  beforeEach(() => {
    aigcMock.reset()
    vi.mocked(fileHelpers.getImageSize).mockResolvedValue({ width: 512, height: 512 })
    mockSaveFile()
  })

  it('captures a version on video completion and syncs later frames config edits', async () => {
    const { gen, draft } = setup()
    gen.setFramesConfig(config)
    expect(draft.versions).toHaveLength(0)

    await gen.generateVideo()
    expect(draft.versions).toHaveLength(1)
    expect(draft.index).toBe(0)
    const [version] = draft.versions
    expect(version.generation.type).toBe('animation')
    // generateVideo resets the frames config, so the fresh version starts without one.
    expect(framesOf(version)).toBeUndefined()

    gen.setFramesConfig(config)
    expect(framesOf(version)).toEqual(config)

    gen.setFramesConfig(edited)
    expect(framesOf(version)).toEqual(edited)
    expect(gen.finishState.status).toBe('initial')

    gen.setFramesConfig(null)
    expect(framesOf(version)).toBeUndefined()

    gen.setFramesConfig(edited)
    draft.select(-1)
    expect(draft.index).toBe(-1)
    if (!(draft.gen instanceof AnimationGen)) throw new Error('animation gen expected')
    draft.gen.setFramesConfig(config)
    expect(framesOf(version)).toEqual(edited)
  })

  it('ignores frames edits before any version exists', () => {
    const project = makeSpxProject()
    const sprite = Sprite.create('TestSprite', '')
    const gen = new AnimationGen(i18n, sprite, project, { video: mockFile('video.mp4') })
    const draft = new SpriteResourceGen(i18n, project, gen)
    expect(draft.versions).toHaveLength(0)
    expect(() => gen.setFramesConfig(config)).not.toThrow()
    expect(draft.versions).toHaveLength(0)
  })

  it('keeps the previous version config while a new video is being generated', async () => {
    const { gen, draft } = setup()
    await gen.generateVideo()
    gen.setFramesConfig(edited)
    const regeneration = gen.generateVideo()
    // generateVideo resets video and frames config synchronously; the old version keeps its config.
    expect(framesOf(draft.versions[0])).toEqual(edited)
    await regeneration
    expect(draft.versions).toHaveLength(2)
  })

  it('resets a finished result when the frames config changes', async () => {
    const { gen, draft } = setup()
    await gen.generateVideo()
    gen.setFramesConfig(config)
    await gen.finish()
    expect(gen.finishState.status).toBe('finished')
    expect(gen.result).not.toBeNull()
    const [version] = draft.versions

    gen.setFramesConfig(edited)
    expect(framesOf(version)).toEqual(edited)
    expect(gen.finishState.status).toBe('initial')
    expect(gen.result).toBeUndefined()
  })
})

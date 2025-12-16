import { describe, it, expect, vi } from 'vitest'
import { AnimationLoopMode, ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import * as aigcApis from '@/apis/aigc'
import * as spxUtils from '@/utils/spx'
import * as fileHelpers from '@/models/common/file'
import * as cloudHelpers from '@/models/common/cloud'
import { makeProject } from '../common/test'
import { SpriteGen } from './sprite-gen'
import type { CostumeGen } from './costume-gen'
import type { AnimationGen } from './animation-gen'

// TODO: Consider abstracting external dependencies to simplify mocking
vi.mock('@/apis/aigc', { spy: true })
vi.spyOn(spxUtils, 'adaptImg').mockImplementation((file) => Promise.resolve(file))
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))
vi.spyOn(cloudHelpers, 'saveFileForWebUrl').mockImplementation(() => Promise.resolve('TODO'))

function enrichSettings(input: string) {
  return Promise.resolve({
    name: 'Enriched Sprite',
    category: SpriteCategory.Unspecified,
    description: `Enriched description for ${input}`,
    artStyle: ArtStyle.Unspecified,
    perspective: Perspective.Unspecified
  } satisfies aigcApis.SpriteSettings)
}

function generateSpriteContent(settings: aigcApis.SpriteSettings) {
  return Promise.resolve({
    costumes: [
      {
        name: 'Costume 1',
        description: `A costume for ${settings.name}`,
        facing: aigcApis.Facing.Front,
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        referenceImageUrl: null
      },
      {
        name: 'Costume 2',
        description: `Another costume for ${settings.name}`,
        facing: aigcApis.Facing.Front,
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        referenceImageUrl: null
      }
    ],
    animations: [
      {
        name: 'walk',
        description: `A walking animation for ${settings.name}`,
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        loopMode: AnimationLoopMode.Loopable,
        referenceFrameUrl: null
      },
      {
        name: 'jump',
        description: `A jumping animation for ${settings.name}`,
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        loopMode: AnimationLoopMode.Loopable,
        referenceFrameUrl: null
      }
    ]
  } satisfies aigcApis.SpriteContentSettings)
}

async function finishCostumeGen(name: string, gen: CostumeGen) {
  vi.mocked(aigcApis.genCostumeImage).mockImplementationOnce(() => {
    return Promise.resolve(`http://example.com/generated-costume-${encodeURIComponent(name)}.png`)
  })
  gen.setSettings({
    description: `Updated description for ${name}`
  })
  expect(gen.settings.description).toBe(`Updated description for ${name}`)
  await gen.generate()
  return gen.finish()
}

async function finishAnimationGen(name: string, gen: AnimationGen) {
  vi.mocked(aigcApis.genAnimationVideo).mockImplementationOnce(() => {
    return Promise.resolve(`http://example.com/generated-animation-${encodeURIComponent(name)}.mp4`)
  })
  vi.mocked(aigcApis.extractAnimationVideoFrames).mockImplementationOnce(() => {
    return Promise.resolve([
      `http://example.com/animation-${encodeURIComponent(name)}-frame-1.png`,
      `http://example.com/animation-${encodeURIComponent(name)}-frame-2.png`,
      `http://example.com/animation-${encodeURIComponent(name)}-frame-3.png`
    ])
  })
  gen.setSettings({
    description: `Updated description for ${name}`
  })
  expect(gen.settings.description).toBe(`Updated description for ${name}`)
  await gen.generateVideo()
  await gen.extractFrames()
  return gen.finish()
}

describe('SpriteGen', () => {
  it('should work well', async () => {
    const project = makeProject()

    const enrichSettingsFn = vi.mocked(aigcApis.enrichSpriteSettings).mockImplementation(enrichSettings)
    const generateSpriteContentFn = vi
      .mocked(aigcApis.genSpriteContentSettings)
      .mockImplementation(generateSpriteContent)

    // 1. Create SpriteGen with initial input
    const gen = new SpriteGen(project, 'A brave knight')
    expect(gen.input).toBe('A brave knight')
    expect(gen.enrichState.state).toBe('initial')
    expect(gen.generateContentState.state).toBe('initial')

    // 2. User updates input
    gen.setInput('A futuristic robot')
    expect(gen.input).toBe('A futuristic robot')

    // 3. Enrich settings based on input
    const enriched = gen.enrich()
    expect(gen.enrichState.state).toBe('running')
    await enriched
    expect(gen.enrichState.state).toBe('finished')
    expect(enrichSettingsFn).toHaveBeenCalledExactlyOnceWith('A futuristic robot', undefined, {
      name: project.name ?? 'TODO',
      description: project.description ?? 'TODO',
      artStyle: project.extraSettings?.artStyle ?? ArtStyle.Unspecified,
      perspective: project.extraSettings?.perspective ?? Perspective.Unspecified
    })
    expect(gen.enrichState.result).toEqual({
      name: 'Enriched Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Enriched description for A futuristic robot',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })
    expect(gen.settings).toEqual({
      name: 'Enriched Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Enriched description for A futuristic robot',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })

    // 4. User updates some settings
    gen.setSettings({
      name: 'Updated Sprite',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown,
      description: 'Updated description for A futuristic robot'
    })
    expect(gen.settings).toEqual({
      name: 'Updated Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Updated description for A futuristic robot',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown
    })

    // 5. Generate sprite's default costume
    const defaultCostumeGen = gen.genDefaultCostume()
    const defaultCostume = await finishCostumeGen('default', defaultCostumeGen)
    gen.finishDefaultCostume(defaultCostume)

    // 6. Generate sprite content (other costumes and animations) structure
    const generated = gen.generateContent()
    expect(gen.generateContentState.state).toBe('running')
    expect(generateSpriteContentFn).toHaveBeenCalledOnce()
    expect(generateSpriteContentFn.mock.calls[0][0]).toEqual({
      name: 'Updated Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Updated description for A futuristic robot',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown
    })
    await generated
    expect(gen.generateContentState.state).toBe('finished')
    expect(gen.costumes.length).toBe(2)
    expect(gen.costumes[0]).toEqual({
      settings: {
        name: 'Costume 1',
        description: 'A costume for Updated Sprite',
        facing: aigcApis.Facing.Front,
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        referenceImageUrl: null
      },
      gen: null,
      result: null
    })
    expect(gen.costumes[1]).toEqual({
      settings: {
        name: 'Costume 2',
        description: 'Another costume for Updated Sprite',
        facing: aigcApis.Facing.Front,
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        referenceImageUrl: null
      },
      gen: null,
      result: null
    })
    expect(gen.animations.length).toBe(2)
    expect(gen.animations[0]).toEqual({
      settings: {
        name: 'walk',
        description: 'A walking animation for Updated Sprite',
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        loopMode: AnimationLoopMode.Loopable,
        referenceFrameUrl: null
      },
      gen: null,
      result: null
    })
    expect(gen.animations[1]).toEqual({
      settings: {
        name: 'jump',
        description: 'A jumping animation for Updated Sprite',
        artStyle: ArtStyle.Unspecified,
        perspective: Perspective.Unspecified,
        loopMode: AnimationLoopMode.Loopable,
        referenceFrameUrl: null
      },
      gen: null,
      result: null
    })

    // 7. Generate and finish other costumes and animations
    const costume1Gen = gen.genCostume('Costume 1')
    expect(gen.getCostume('Costume 1')?.gen).toBe(costume1Gen)
    const costume1 = await finishCostumeGen('Costume 1', costume1Gen)
    gen.finishCostume('Costume 1', costume1)

    const costume2Gen = gen.genCostume('Costume 2')
    expect(gen.getCostume('Costume 2')?.gen).toBe(costume2Gen)
    const costume2 = await finishCostumeGen('Costume 2', costume2Gen)
    gen.finishCostume('Costume 2', costume2)

    const animationWalkGen = gen.genAnimation('walk')
    expect(gen.getAnimation('walk')?.gen).toBe(animationWalkGen)
    const animationWalk = await finishAnimationGen('walk', animationWalkGen)
    gen.finishAnimation('walk', animationWalk)

    const animationJumpGen = gen.genAnimation('jump')
    expect(gen.getAnimation('jump')?.gen).toBe(animationJumpGen)
    const animationJump = await finishAnimationGen('jump', animationJumpGen)
    gen.finishAnimation('jump', animationJump)

    // 8. Finish the whole sprite generation
    const sprite = gen.finish()
    expect(sprite.name).toBe('UpdatedSprite')
    expect(sprite.assetMetadata?.description).toBe('Updated description for A futuristic robot')
    expect(sprite.assetMetadata?.extraSettings).toEqual({
      category: SpriteCategory.Unspecified,
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown
    })
    expect(sprite.costumes.length).toBe(3)
    expect(sprite.costumes[0].name).toBe('default')
    expect(sprite.costumes[0].pivot).toEqual({ x: 25, y: 25 })
    expect(sprite.costumes[1].name).toBe('costume 1')
    expect(sprite.costumes[1].pivot).toEqual({ x: 25, y: 25 })
    expect(sprite.costumes[2].name).toBe('costume 2')
    expect(sprite.costumes[2].pivot).toEqual({ x: 25, y: 25 })
    expect(sprite.animations.length).toBe(2)
    expect(sprite.animations[0].name).toBe('walk')
    expect(sprite.animations[1].name).toBe('jump')
  })
})

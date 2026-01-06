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
  vi.mocked(aigcApis.createTask).mockImplementationOnce(() => {
    return Promise.resolve({
      id: 'mock-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: aigcApis.TaskType.GenerateCostume,
      status: aigcApis.TaskStatus.Pending
    } satisfies aigcApis.Task<aigcApis.TaskType.GenerateCostume>)
  })
  vi.mocked(aigcApis.subscribeTaskEvents).mockImplementationOnce(async function* () {
    yield {
      type: aigcApis.TaskEventType.Completed,
      data: {
        result: {
          imageUrls: [`http://example.com/generated-costume-${encodeURIComponent(name)}.png`]
        }
      }
    } satisfies aigcApis.TaskEventCompleted<aigcApis.TaskType.GenerateCostume>
  })
  gen.setSettings({
    description: `Updated description for ${name}`
  })
  expect(gen.settings.description).toBe(`Updated description for ${name}`)
  await gen.generate()
  return gen.finish()
}

async function finishAnimationGen(name: string, gen: AnimationGen) {
  vi.mocked(aigcApis.createTask).mockImplementationOnce(() => {
    return Promise.resolve({
      id: 'mock-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: aigcApis.TaskType.GenerateAnimationVideo,
      status: aigcApis.TaskStatus.Pending
    } satisfies aigcApis.Task<aigcApis.TaskType.GenerateAnimationVideo>)
  })
  vi.mocked(aigcApis.subscribeTaskEvents).mockImplementationOnce(async function* () {
    yield {
      type: aigcApis.TaskEventType.Completed,
      data: {
        result: {
          videoUrl: `http://example.com/generated-animation-${encodeURIComponent(name)}.mp4`
        }
      }
    } satisfies aigcApis.TaskEventCompleted<aigcApis.TaskType.GenerateAnimationVideo>
  })
  gen.setSettings({
    description: `Updated description for ${name}`
  })
  expect(gen.settings.description).toBe(`Updated description for ${name}`)
  await gen.generateVideo()
  vi.mocked(aigcApis.createTask).mockImplementationOnce(() => {
    return Promise.resolve({
      id: 'mock-2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: aigcApis.TaskType.ExtractVideoFrames,
      status: aigcApis.TaskStatus.Pending
    } satisfies aigcApis.Task<aigcApis.TaskType.ExtractVideoFrames>)
  })
  vi.mocked(aigcApis.subscribeTaskEvents).mockImplementationOnce(async function* () {
    yield {
      type: aigcApis.TaskEventType.Completed,
      data: {
        result: {
          frameUrls: [
            `http://example.com/animation-${encodeURIComponent(name)}-frame-1.png`,
            `http://example.com/animation-${encodeURIComponent(name)}-frame-2.png`,
            `http://example.com/animation-${encodeURIComponent(name)}-frame-3.png`
          ]
        }
      }
    } satisfies aigcApis.TaskEventCompleted<aigcApis.TaskType.ExtractVideoFrames>
  })
  gen.setFramesConfig({
    startTime: 0,
    duration: 1000,
    interval: 300
  })
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

    // Create SpriteGen with initial input
    const gen = new SpriteGen(project, 'A brave knight')
    expect(gen.settings.description).toBe('A brave knight')
    expect(gen.enrichState.status).toBe('initial')
    expect(gen.contentPreparingState.status).toBe('initial')

    // Enrich settings based on input
    const enriched = gen.enrich()
    expect(gen.enrichState.status).toBe('running')
    expect(enrichSettingsFn).toHaveBeenCalledOnce()
    await enriched
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.enrichState.result).toEqual({
      name: 'Enriched Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Enriched description for A brave knight',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })
    expect(gen.settings).toEqual({
      name: 'Enriched Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Enriched description for A brave knight',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })

    // User updates some settings
    gen.setSettings({
      name: 'Updated Sprite',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown,
      description: 'Updated description for A brave knight'
    })
    expect(gen.settings).toEqual({
      name: 'Updated Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Updated description for A brave knight',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown
    })

    vi.mocked(aigcApis.createTask).mockImplementation(() => {
      return Promise.resolve({
        id: 'mock-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: aigcApis.TaskType.GenerateCostume,
        status: aigcApis.TaskStatus.Pending
      } satisfies aigcApis.Task<aigcApis.TaskType.GenerateCostume>)
    })
    vi.mocked(aigcApis.subscribeTaskEvents).mockImplementationOnce(async function* () {
      yield {
        type: aigcApis.TaskEventType.Completed,
        data: {
          result: {
            imageUrls: [1, 2, 3, 4].map((i) => `http://example.com/generated-sprite-image-${i}.png`)
          }
        }
      } satisfies aigcApis.TaskEventCompleted<aigcApis.TaskType.GenerateCostume>
    })
    const images = await gen.genImages()
    expect(gen.imagesGenState.status).toBe('finished')
    expect(images.length).toBe(4)
    gen.setImage(images[0])
    expect(gen.image).toBe(images[0])

    // Prepare sprite content
    const prepared = gen.prepareContent()
    expect(gen.contentPreparingState.status).toBe('running')
    await prepared
    expect(gen.contentPreparingState.status).toBe('finished')
    expect(generateSpriteContentFn).toHaveBeenCalledOnce()
    expect(generateSpriteContentFn.mock.calls[0][0]).toEqual({
      name: 'Updated Sprite',
      category: SpriteCategory.Unspecified,
      description: 'Updated description for A brave knight',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown
    })
    expect(gen.costumes.length).toBe(3)
    expect(gen.costumes[0].settings).toEqual({
      name: 'default',
      description:
        'The default costume for sprite "Updated Sprite". The sprite: Updated description for A brave knight',
      facing: aigcApis.Facing.Front,
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown,
      referenceImageUrl: null
    })
    expect(gen.costumes[1].settings).toEqual({
      name: 'Costume 1',
      description: 'A costume for Updated Sprite',
      facing: aigcApis.Facing.Front,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null
    })
    expect(gen.costumes[2].settings).toEqual({
      name: 'Costume 2',
      description: 'Another costume for Updated Sprite',
      facing: aigcApis.Facing.Front,
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      referenceImageUrl: null
    })
    expect(gen.animations.length).toBe(2)
    expect(gen.animations[0].settings).toEqual({
      name: 'walk',
      description: 'A walking animation for Updated Sprite',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      loopMode: AnimationLoopMode.Loopable,
      referenceFrameUrl: null
    })
    expect(gen.animations[1].settings).toEqual({
      name: 'jump',
      description: 'A jumping animation for Updated Sprite',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified,
      loopMode: AnimationLoopMode.Loopable,
      referenceFrameUrl: null
    })

    // Generate and finish other costumes and animations
    const costume1Gen = gen.costumes[1]
    await finishCostumeGen('Costume 1', costume1Gen)

    const costume2Gen = gen.costumes[2]
    await finishCostumeGen('Costume 2', costume2Gen)

    const animationWalkGen = gen.animations[0]
    await finishAnimationGen('walk', animationWalkGen)

    const animationJumpGen = gen.animations[1]
    await finishAnimationGen('jump', animationJumpGen)

    // Finish the whole sprite generation
    const sprite = gen.finish()
    expect(sprite.name).toBe('UpdatedSprite')
    expect(sprite.assetMetadata?.description).toBe('Updated description for A brave knight')
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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import { TaskStatus } from '@/apis/aigc'
import { createI18n } from '@/utils/i18n'
import * as fileHelpers from '@/models/common/file'
import { makeProject } from '../common/test'
import { setupAigcMock, MockAigcApis } from './aigc-mock'
import { SpriteGen } from './sprite-gen'
import type { CostumeGen } from './costume-gen'
import type { AnimationGen } from './animation-gen'
import { RotationStyle } from '../sprite'

setupAigcMock()
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))

const aigcMock = new MockAigcApis()
aigcMock.mock()

async function finishCostumeGen(name: string, gen: CostumeGen) {
  gen.setSettings({
    description: `Updated description for ${name}`
  })
  expect(gen.settings.description).toBe(`Updated description for ${name}`)
  await gen.generate()
  return gen.finish()
}

async function finishAnimationGen(name: string, gen: AnimationGen) {
  gen.setSettings({
    description: `Updated description for ${name}`
  })
  expect(gen.settings.description).toBe(`Updated description for ${name}`)
  await gen.generateVideo()
  gen.setFramesConfig({
    startTime: 0,
    duration: 1000,
    interval: 300
  })
  await gen.extractFrames()
  return gen.finish()
}

describe('SpriteGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeProject()

    // Create SpriteGen with initial input
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
    expect(gen.settings.description).toBe('A brave knight')
    expect(gen.enrichState.status).toBe('initial')
    expect(gen.contentPreparingState.status).toBe('initial')

    // Enrich settings based on input
    const enriched = gen.enrich()
    expect(gen.enrichState.status).toBe('running')
    await enriched
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.enrichState.result).toEqual({
      name: 'EnrichedSprite',
      category: SpriteCategory.Unspecified,
      description: 'Enriched description for A brave knight',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })
    expect(gen.settings).toEqual({
      name: 'EnrichedSprite',
      category: SpriteCategory.Unspecified,
      description: 'Enriched description for A brave knight',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })

    // User updates some settings
    gen.setSettings({
      name: 'UpdatedSprite',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown,
      description: 'Updated description for A brave knight'
    })
    expect(gen.settings).toEqual({
      name: 'UpdatedSprite',
      category: SpriteCategory.Unspecified,
      description: 'Updated description for A brave knight',
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown
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
    expect(gen.costumes.length).toBe(3)
    expect(gen.costumes[0].settings.name).toBe('default')
    expect(gen.costumes[0].settings.description).toBe('Updated description for A brave knight')
    expect(gen.costumes[1].settings.name).toBe('costume-1')
    expect(gen.costumes[1].settings.description).toBe('A costume for UpdatedSprite')
    expect(gen.costumes[2].settings.name).toBe('costume-2')
    expect(gen.costumes[2].settings.description).toBe('Another costume for UpdatedSprite')
    expect(gen.animations.length).toBe(2)
    expect(gen.animations[0].settings.name).toBe('walk')
    expect(gen.animations[0].settings.description).toBe('A walking animation for UpdatedSprite')
    expect(gen.animations[1].settings.name).toBe('jump')
    expect(gen.animations[1].settings.description).toBe('A jumping animation for UpdatedSprite')

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
    expect(sprite.costumes[1].name).toBe('costume-1')
    expect(sprite.costumes[1].pivot).toEqual({ x: 25, y: 25 })
    expect(sprite.costumes[2].name).toBe('costume-2')
    expect(sprite.costumes[2].pivot).toEqual({ x: 25, y: 25 })
    expect(sprite.animations.length).toBe(2)
    expect(sprite.animations[0].name).toBe('walk')
    expect(sprite.animations[1].name).toBe('jump')
  })

  it('should validate sprite name correctly', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')

    await gen.enrich()
    gen.setSettings({ name: 'Sprite1' })
    await gen.genImages()
    gen.setImage(gen.imagesGenState.result![0])
    await gen.prepareContent()
    const sprite1 = gen.finish()
    project.addSprite(sprite1)

    // Create another gen with duplicate name should fail
    const gen2 = new SpriteGen(createI18n({ lang: 'en' }), project, 'Another sprite')
    await gen2.enrich()
    expect(() => gen2.setName('Sprite1')).toThrow()
  })

  it('should handle errors and retry successfully', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')

    // First enrich attempt fails
    aigcMock.injectErrorOnce('enrichSpriteSettings', new Error('Network error'))
    await expect(gen.enrich()).rejects.toThrow('Network error')
    expect(gen.enrichState.status).toBe('failed')

    // Retry enrich and succeed
    await gen.enrich()
    expect(gen.enrichState.status).toBe('finished')

    // First genImages attempt fails
    aigcMock.injectErrorOnce('subscribeTaskEvents', new Error('Task processing error'))
    await expect(gen.genImages()).rejects.toThrow('Task processing error')
    expect(gen.imagesGenState.status).toBe('failed')

    // Retry genImages and succeed
    await gen.genImages()
    expect(gen.imagesGenState.status).toBe('finished')
  })

  it('should throw error when preparing content without image', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')

    await gen.enrich()

    // Try to prepare content without generating images first
    await expect(gen.prepareContent()).rejects.toThrow('image expected')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'First description')

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should allow multiple image generations', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')

    await gen.enrich()

    const firstBatch = await gen.genImages()
    expect(firstBatch.length).toBe(4)

    gen.setSettings({ artStyle: ArtStyle.FlatDesign })
    const secondBatch = await gen.genImages()
    expect(secondBatch.length).toBe(4)
    expect(secondBatch).not.toBe(firstBatch)
  })

  it('should track content preparing correctly', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')

    expect(gen.contentPreparingState.status).toBe('initial')

    await gen.enrich()
    await gen.genImages()
    gen.setImage(gen.imagesGenState.result![0])

    const prepared = gen.prepareContent()
    expect(gen.contentPreparingState.status).toBe('running')
    await prepared
    expect(gen.contentPreparingState.status).toBe('finished')
    expect(gen.costumes.length).toBe(3)
    expect(gen.animations.length).toBe(2)
  })

  it('should cancel running image generation', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')
    const tasks = aigcMock.tasks

    const genImagesPromise = gen.genImages()
    await aigcMock.waitForTaskCount(1)
    await gen.cancel()

    await expect(genImagesPromise).rejects.toThrow('cancelled')
    const lastRecord = Array.from(tasks.values()).at(-1)
    expect(lastRecord?.task.status).toBe(TaskStatus.Cancelled)
  })

  it('should cancel running costume and animation generations', async () => {
    const project = makeProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')
    const tasks = aigcMock.tasks

    await gen.enrich()
    await gen.genImages()
    gen.setImage(gen.imagesGenState.result![0])
    await gen.prepareContent()

    const costumeGen = gen.costumes[1]
    const animationGen = gen.animations[0]
    const taskCountBefore = tasks.size

    const costumePromise = costumeGen.generate()
    const animationPromise = animationGen.generateVideo()
    await aigcMock.waitForTaskCount(taskCountBefore + 2)
    await gen.cancel()

    await expect(costumePromise).rejects.toThrow('cancelled')
    await expect(animationPromise).rejects.toThrow('cancelled')

    const newRecords = Array.from(tasks.values()).slice(taskCountBefore)
    expect(newRecords.length).toBe(2)
    expect(newRecords.every((r) => r.task.status === TaskStatus.Cancelled)).toBe(true)
  })

  it('should set rotation style based on perspective', async () => {
    const project = makeProject()

    // Test SideScrolling perspective -> LeftRight rotation style
    const gen1 = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')
    await gen1.enrich()
    gen1.setSettings({ perspective: Perspective.SideScrolling })
    await gen1.genImages()
    gen1.setImage(gen1.imagesGenState.result![0])
    await gen1.prepareContent()
    const sprite1 = gen1.finish()
    expect(sprite1.rotationStyle).toBe(RotationStyle.LeftRight)

    // Test AngledTopDown perspective -> LeftRight rotation style
    const gen2 = new SpriteGen(createI18n({ lang: 'en' }), project, 'Another sprite')
    await gen2.enrich()
    gen2.setSettings({ name: 'Sprite2', perspective: Perspective.AngledTopDown })
    await gen2.genImages()
    gen2.setImage(gen2.imagesGenState.result![0])
    await gen2.prepareContent()
    const sprite2 = gen2.finish()
    expect(sprite2.rotationStyle).toBe(RotationStyle.LeftRight)

    // Test Unspecified perspective -> Normal rotation style
    const gen3 = new SpriteGen(createI18n({ lang: 'en' }), project, 'Third sprite')
    await gen3.enrich()
    gen3.setSettings({ name: 'Sprite3', perspective: Perspective.Unspecified })
    await gen3.genImages()
    gen3.setImage(gen3.imagesGenState.result![0])
    await gen3.prepareContent()
    const sprite3 = gen3.finish()
    expect(sprite3.rotationStyle).toBe(RotationStyle.Normal)
  })
})

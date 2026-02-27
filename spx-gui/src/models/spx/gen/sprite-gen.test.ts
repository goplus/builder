import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import { setupAigcMock } from './aigc-mock' // Put me before importing `@/apis/aigc` to ensure the mock is set up correctly
import { TaskStatus } from '@/apis/aigc'
import { createI18n } from '@/utils/i18n'
import * as fileHelpers from '@/models/common/file'
import { sndFiles } from '@/models/common/test'
import { GenState } from '@/components/editor/gen'
import { RotationStyle, State } from '../sprite'
import { makeSpxProject } from '../common/test'
import type { CostumeGen } from './costume-gen'
import type { AnimationGen } from './animation-gen'
import { SpriteGen } from './sprite-gen'

const aigcMock = setupAigcMock()
vi.spyOn(fileHelpers, 'getImageSize').mockReturnValue(Promise.resolve({ width: 100, height: 100 }))

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
  return gen.finish()
}

describe('SpriteGen', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('should work well', async () => {
    const project = makeSpxProject()

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
    gen.setImageIndex(0)
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
    expect(sprite.getAnimationBoundStates(sprite.animations[0].id)).toEqual([State.Default])
    expect(sprite.getAnimationBoundStates(sprite.animations[1].id)).toEqual([State.Step])
  })

  it('should validate sprite name when parent is set', () => {
    const i18n = createI18n({ lang: 'en' })
    const project = makeSpxProject()
    const genState = new GenState(i18n, project)

    const gen1 = new SpriteGen(i18n, project, {
      settings: { name: 'Knight' }
    })
    genState.addSprite(gen1)

    const gen2 = new SpriteGen(i18n, project, {
      settings: { name: 'Wizard' }
    })
    genState.addSprite(gen2)

    // Should throw when trying to set a name that conflicts with another gen in the same GenState
    expect(() => gen2.setName('Knight')).toThrow()

    // Should allow setting a unique name
    gen2.setName('Archer')
    expect(gen2.settings.name).toBe('Archer')
  })

  it('should handle errors and retry successfully', async () => {
    const project = makeSpxProject()
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

  it('should use default costume as default reference for animations', async () => {
    const project = makeSpxProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')
    await gen.enrich()
    await gen.genImages()
    gen.setImageIndex(0)
    await gen.prepareContent()
    expect(gen.animations[0].referenceCostume).toBe(gen.defaultCostume!.result)
  })

  it('should throw error when preparing content without image', async () => {
    const project = makeSpxProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')

    await gen.enrich()

    // Try to prepare content without generating images first
    await expect(gen.prepareContent()).rejects.toThrow('image expected')
  })

  it('should allow multiple enrichments', async () => {
    const project = makeSpxProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'First description')

    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('First description')

    gen.setSettings({ description: 'Second description' })
    await gen.enrich()
    expect(gen.enrichState.result?.description).toContain('Second description')
  })

  it('should allow multiple image generations', async () => {
    const project = makeSpxProject()
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
    const project = makeSpxProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')

    expect(gen.contentPreparingState.status).toBe('initial')

    await gen.enrich()
    await gen.genImages()
    gen.setImageIndex(0)

    const prepared = gen.prepareContent()
    expect(gen.contentPreparingState.status).toBe('running')
    await prepared
    expect(gen.contentPreparingState.status).toBe('finished')
    expect(gen.costumes.length).toBe(3)
    expect(gen.animations.length).toBe(2)
  })

  it('should cancel running image generation', async () => {
    const project = makeSpxProject()
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
    const project = makeSpxProject()
    const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')
    const tasks = aigcMock.tasks

    await gen.enrich()
    await gen.genImages()
    gen.setImageIndex(0)
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
    const project = makeSpxProject()

    // Test SideScrolling perspective -> LeftRight rotation style
    const gen1 = new SpriteGen(createI18n({ lang: 'en' }), project, 'A test sprite')
    await gen1.enrich()
    gen1.setSettings({ perspective: Perspective.SideScrolling })
    await gen1.genImages()
    gen1.setImageIndex(0)
    await gen1.prepareContent()
    const sprite1 = gen1.finish()
    expect(sprite1.rotationStyle).toBe(RotationStyle.LeftRight)

    // Test AngledTopDown perspective -> LeftRight rotation style
    const gen2 = new SpriteGen(createI18n({ lang: 'en' }), project, 'Another sprite')
    await gen2.enrich()
    gen2.setSettings({ name: 'Sprite2', perspective: Perspective.AngledTopDown })
    await gen2.genImages()
    gen2.setImageIndex(0)
    await gen2.prepareContent()
    const sprite2 = gen2.finish()
    expect(sprite2.rotationStyle).toBe(RotationStyle.LeftRight)

    // Test Unspecified perspective -> Normal rotation style
    const gen3 = new SpriteGen(createI18n({ lang: 'en' }), project, 'Third sprite')
    await gen3.enrich()
    gen3.setSettings({ name: 'Sprite3', perspective: Perspective.Unspecified })
    await gen3.genImages()
    gen3.setImageIndex(0)
    await gen3.prepareContent()
    const sprite3 = gen3.finish()
    expect(sprite3.rotationStyle).toBe(RotationStyle.Normal)
  })

  describe('export/load', () => {
    function getPreviewSpriteContentSnapshot(gen: SpriteGen) {
      const previewSprite = gen.previewSprite
      return {
        costumes: previewSprite.costumes
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        animations: previewSprite.animations
          .map((a) => ({
            id: a.id,
            name: a.name,
            boundStates: previewSprite
              .getAnimationBoundStates(a.id)
              .slice()
              .sort((a1, a2) => a1.localeCompare(a2))
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      }
    }

    async function assertExportLoad(gen: SpriteGen) {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const rawFiles = gen.export()
      const files = sndFiles(rawFiles)
      const loaded = await SpriteGen.load(gen.name, i18n, project, files)
      assertSpriteGenEqual(gen, loaded)
      return loaded
    }

    function assertSpriteGenEqual(original: SpriteGen, loaded: SpriteGen) {
      expect(loaded.id).toBe(original.id)
      expect(loaded.settings).toEqual(original.settings)
      expect(loaded.imageIndex).toBe(original.imageIndex)
      expect(loaded.enrichState.status).toBe(original.enrichState.status)
      if (original.enrichState.status === 'finished') {
        expect(loaded.enrichState.result).toEqual(original.enrichState.result)
      }
      expect(loaded.imagesGenState.status).toBe(original.imagesGenState.status)
      expect(loaded.contentPreparingState.status).toBe(original.contentPreparingState.status)
      expect(loaded.costumes.length).toBe(original.costumes.length)
      expect(loaded.animations.length).toBe(original.animations.length)
      for (let i = 0; i < original.costumes.length; i++) {
        expect(loaded.costumes[i].id).toBe(original.costumes[i].id)
        expect(loaded.costumes[i].settings).toEqual(original.costumes[i].settings)
      }
      for (let i = 0; i < original.animations.length; i++) {
        expect(loaded.animations[i].id).toBe(original.animations[i].id)
        expect(loaded.animations[i].settings).toEqual(original.animations[i].settings)
      }
    }

    it('should export and load initial state', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      gen.setSettings({ name: 'Knight' })
      await assertExportLoad(gen)
    })

    it('should export and load after enrich', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      await assertExportLoad(gen)
    })

    it('should export and load after genImages', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      await gen.genImages()
      gen.setImageIndex(2)
      const loaded = await assertExportLoad(gen)
      expect(loaded.imageIndex).toBe(2)
      expect(loaded.imagesGenState.status).toBe('finished')
      expect(loaded.imagesGenState.result?.length).toBe(4)
    })

    it('should export and load after prepareContent', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({ name: 'Knight' })
      await gen.genImages()
      gen.setImageIndex(0)
      await gen.prepareContent()
      const loaded = await assertExportLoad(gen)
      expect(loaded.contentPreparingState.status).toBe('finished')
      expect(loaded.costumes.length).toBe(3)
      expect(loaded.animations.length).toBe(2)
    })

    it('should export and load with selectedItem', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({ name: 'Knight' })
      await gen.genImages()
      gen.setImageIndex(0)
      await gen.prepareContent()
      gen.setSelectedItem({ type: 'costume', id: gen.costumes[1].id })
      const loaded = await assertExportLoad(gen)
      expect(loaded.selectedItem).toEqual({ type: 'costume', id: gen.costumes[1].id })
    })

    it('should export and load with finished costumes and animations', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({ name: 'Knight' })
      await gen.genImages()
      gen.setImageIndex(0)
      await gen.prepareContent()

      await finishCostumeGen('Costume 1', gen.costumes[1])
      await finishAnimationGen('walk', gen.animations[0])

      const loaded = await assertExportLoad(gen)
      expect(loaded.costumes[1].finishState.status).toBe('finished')
      expect(loaded.costumes[1].result).not.toBeNull()
      expect(loaded.costumes[1].result!.name).toBe(gen.costumes[1].result!.name)
      expect(loaded.animations[0].finishState.status).toBe('finished')
      expect(loaded.animations[0].result).not.toBeNull()
      expect(loaded.animations[0].result!.name).toBe(gen.animations[0].result!.name)
    })

    it('should keep previewSprite costumes and animations after export and load', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({ name: 'Knight' })
      await gen.genImages()
      gen.setImageIndex(0)
      await gen.prepareContent()

      await finishCostumeGen('Costume 1', gen.costumes[1])
      await finishAnimationGen('walk', gen.animations[0])
      await flushPromises()

      const originalSnapshot = getPreviewSpriteContentSnapshot(gen)
      const loaded = await assertExportLoad(gen)
      await flushPromises()
      const loadedSnapshot = getPreviewSpriteContentSnapshot(loaded)

      expect(loadedSnapshot).toEqual(originalSnapshot)
    })

    it('should restore animation referenceCostume after export and load', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({ name: 'Knight' })
      await gen.genImages()
      gen.setImageIndex(0)
      await gen.prepareContent()

      const loaded1 = await assertExportLoad(gen)
      expect(loaded1.animations[0].referenceCostume).toBe(loaded1.defaultCostume!.result)

      const targetCostumeGen = gen.costumes[1]
      await finishCostumeGen('Costume 1', targetCostumeGen)
      gen.animations[0].setReferenceCostume(targetCostumeGen.result!.id)
      expect(gen.animations[0].referenceCostume).toBe(targetCostumeGen.result)

      const loaded2 = await assertExportLoad(gen)
      expect(loaded2.animations[0].referenceCostume).toBe(loaded2.costumes[1].result)
    })

    it('should export and load full finished state', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({
        name: 'Knight',
        artStyle: ArtStyle.FlatDesign,
        perspective: Perspective.AngledTopDown
      })
      await gen.genImages()
      gen.setImageIndex(0)
      await gen.prepareContent()

      for (const c of gen.costumes.slice(1)) {
        await finishCostumeGen(c.name, c)
      }
      for (const a of gen.animations) {
        await finishAnimationGen(a.name, a)
      }

      const loaded = await assertExportLoad(gen)
      expect(loaded.costumes.every((c) => c.finishState.status === 'finished')).toBe(true)
      expect(loaded.animations.every((a) => a.finishState.status === 'finished')).toBe(true)
    })

    it('should not have file path conflicts between nested costume and animation gens', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({ name: 'Knight' })
      await gen.genImages()
      gen.setImageIndex(0)
      await gen.prepareContent()

      await finishCostumeGen('Costume 1', gen.costumes[1])
      await finishAnimationGen('walk', gen.animations[0])

      const files = gen.export()
      const filePaths = Object.keys(files)
      const uniquePaths = new Set(filePaths)
      expect(filePaths.length).toBe(uniquePaths.size)
    })

    it('should export and load with genImages task running', async () => {
      const project = makeSpxProject()
      const gen = new SpriteGen(createI18n({ lang: 'en' }), project, 'A brave knight')
      await gen.enrich()
      gen.setSettings({ name: 'Knight' })

      const genImagesPromise = gen.genImages()
      await aigcMock.waitForTaskCount(1)

      const rawFiles = gen.export()
      const files = sndFiles(rawFiles)

      const i18n = createI18n({ lang: 'en' })
      const loadProject = makeSpxProject()
      const loaded = await SpriteGen.load(gen.name, i18n, loadProject, files)
      expect(loaded.imagesGenState.status).toBe('running')

      await genImagesPromise
      await flushPromises()
      expect(gen.imagesGenState.status).toBe('finished')
      expect(loaded.imagesGenState.status).toBe('finished')
      expect(loaded.imagesGenState.result?.length).toBe(gen.imagesGenState.result?.length)
    })

    it('should loadAll from exported files', async () => {
      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()

      const gen1 = new SpriteGen(i18n, project, 'A brave knight')
      await gen1.enrich()
      gen1.setSettings({ name: 'Knight' })
      await gen1.genImages()
      gen1.setImageIndex(0)

      const gen2 = new SpriteGen(i18n, project, 'A wise wizard')
      await gen2.enrich()
      gen2.setSettings({ name: 'Wizard' })

      const allFiles = { ...gen1.export(), ...gen2.export() }
      const files = sndFiles(allFiles)

      const loadedGens = await SpriteGen.loadAll(i18n, makeSpxProject(), files)
      expect(loadedGens.length).toBe(2)

      const loadedNames = loadedGens.map((g) => g.name).sort()
      expect(loadedNames).toEqual(['Knight', 'Wizard'])

      const loadedKnight = loadedGens.find((g) => g.name === 'Knight')!
      expect(loadedKnight.imagesGenState.status).toBe('finished')
      expect(loadedKnight.imagesGenState.result?.length).toBe(4)
      expect(loadedKnight.imageIndex).toBe(0)

      const loadedWizard = loadedGens.find((g) => g.name === 'Wizard')!
      expect(loadedWizard.enrichState.status).toBe('finished')
      expect(loadedWizard.imagesGenState.status).toBe('initial')
    })
  })
})

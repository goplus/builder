import { describe, it, expect, vi } from 'vitest'
import * as aigcApis from '@/apis/aigc'
import * as spxUtils from '@/utils/spx'
import { ArtStyle, BackdropCategory, Perspective } from '@/apis/common'
import { makeProject } from '../common/test'
import { BackdropGen } from './backdrop-gen'

vi.spyOn(aigcApis, 'enrichBackdropSettings').mockImplementation((input) =>
  Promise.resolve<aigcApis.BackdropSettings>({
    name: 'Enriched Backdrop',
    category: BackdropCategory.Unspecified,
    description: `A beautiful backdrop of ${input}`,
    artStyle: ArtStyle.Unspecified,
    perspective: Perspective.Unspecified
  })
)
vi.spyOn(aigcApis, 'createTask').mockImplementation(() => {
  return Promise.resolve<aigcApis.Task<aigcApis.TaskType.GenerateBackdrop>>({
    id: 'mock-task-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: aigcApis.TaskType.GenerateBackdrop,
    status: aigcApis.TaskStatus.Pending
  })
})
vi.spyOn(aigcApis, 'subscribeTaskEvents').mockImplementation(async function* () {
  yield {
    type: aigcApis.TaskEventType.Completed,
    data: {
      result: {
        imageUrls: [
          `http://example.com/generated-backdrop-1.png`,
          `http://example.com/generated-backdrop-2.png`,
          `http://example.com/generated-backdrop-3.png`,
          `http://example.com/generated-backdrop-4.png`
        ]
      }
    }
  } satisfies aigcApis.TaskEventCompleted<aigcApis.TaskType.GenerateBackdrop>
})
vi.spyOn(spxUtils, 'adaptImg').mockImplementation((file) => Promise.resolve(file))

describe('BackdropGen', () => {
  it('should work well', async () => {
    const project = makeProject()

    // 1. Create BackdropGen with initial description
    const gen = new BackdropGen(project, 'A sunny beach with palm trees and clear blue water')
    expect(gen.settings.description).toBe('A sunny beach with palm trees and clear blue water')
    expect(gen.enrichState.status).toBe('initial')
    expect(gen.imagesGenState.status).toBe('initial')

    // 2. User updates description
    gen.setSettings({ description: 'A majestic mountain range under a clear blue sky' })
    expect(gen.settings.description).toBe('A majestic mountain range under a clear blue sky')

    // 3. Enrich settings based on input
    const enriched = gen.enrich()
    expect(gen.enrichState.status).toBe('running')
    await enriched
    expect(gen.enrichState.status).toBe('finished')
    expect(gen.enrichState.result).toEqual({
      name: 'Enriched Backdrop',
      category: BackdropCategory.Unspecified,
      description: 'A beautiful backdrop of A majestic mountain range under a clear blue sky',
      artStyle: ArtStyle.Unspecified,
      perspective: Perspective.Unspecified
    })

    // 4. User updates some settings
    gen.setSettings({
      artStyle: ArtStyle.FlatDesign,
      perspective: Perspective.AngledTopDown,
      description: 'A fantastic backdrop of a river flowing through a lush forest'
    })

    // 5. Generate backdrop images
    const generated = gen.genImages()
    expect(gen.imagesGenState.status).toBe('running')
    await generated
    expect(gen.imagesGenState.status).toBe('finished')
    expect(gen.imagesGenState.result?.length).toBe(4)

    // 6. Select one generated image
    gen.setImage(gen.imagesGenState.result![2])
    expect(gen.image).toBe(gen.imagesGenState.result![2])

    // 7. Finish the backdrop generation
    const backdrop = await gen.finish()
    expect(backdrop.name).toBe('enriched Backdrop')
    expect(backdrop.assetMetadata).toEqual({
      description: 'A fantastic backdrop of a river flowing through a lush forest',
      extraSettings: {
        category: BackdropCategory.Unspecified,
        artStyle: ArtStyle.FlatDesign,
        perspective: Perspective.AngledTopDown
      }
    })
  })
})

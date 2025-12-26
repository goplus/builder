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
vi.spyOn(aigcApis, 'genBackdropImage').mockImplementation((settings) =>
  Promise.resolve(`http://example.com/generated-backdrop-based-on-${encodeURIComponent(settings.description)}.png`)
)
vi.spyOn(spxUtils, 'adaptImg').mockImplementation((file) => Promise.resolve(file))

describe('BackdropGen', () => {
  it('should work well', async () => {
    const project = makeProject()

    // 1. Create BackdropGen with initial description
    const gen = new BackdropGen(project, 'A sunny beach with palm trees and clear blue water')
    expect(gen.settings.description).toBe('A sunny beach with palm trees and clear blue water')
    expect(gen.enrichState.status).toBe('initial')
    expect(gen.generateState.status).toBe('initial')

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

    // 5. Generate backdrop image
    const generated = gen.generate()
    expect(gen.generateState.status).toBe('running')
    await generated
    expect(gen.generateState.status).toBe('finished')
    expect(gen.generateState.result).toBe(
      'http://example.com/generated-backdrop-based-on-A%20fantastic%20backdrop%20of%20a%20river%20flowing%20through%20a%20lush%20forest.png'
    )

    // 6. Finish the backdrop generation
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

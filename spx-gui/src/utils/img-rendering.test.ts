import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fromText } from '@/models/common/file'
import { getRenderableImageUrl } from './img-rendering'
import { injectScratchFontsToSvgText } from './scratch-svg-font'

vi.mock('./scratch-svg-font', () => ({
  injectScratchFontsToSvgText: vi.fn(async (svgText: string) =>
    svgText.includes('font-family="Scratch"') ? '<svg>injected</svg>' : null
  )
}))

describe('getRenderableImageUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    let objectUrlId = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:mock-${objectUrlId++}`)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('reuses injected results for the same source File', async () => {
    const file = fromText('costume.svg', '<svg><text font-family="Scratch">hello</text></svg>', {
      type: 'image/svg+xml'
    })
    const ctrl1 = new AbortController()
    const ctrl2 = new AbortController()

    await getRenderableImageUrl(file, ctrl1.signal)
    await getRenderableImageUrl(file, ctrl2.signal)
    expect(injectScratchFontsToSvgText).toHaveBeenCalledTimes(1)
  })

  it('does not let one consumer abort the shared derived SVG cache', async () => {
    const file = fromText('costume.svg', '<svg><text font-family="Scratch">hello</text></svg>', {
      type: 'image/svg+xml'
    })
    const ctrl1 = new AbortController()
    const ctrl2 = new AbortController()
    let resolveInjectedSvg!: (svgText: string) => void
    vi.mocked(injectScratchFontsToSvgText).mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveInjectedSvg = resolve
        })
    )

    const url1 = getRenderableImageUrl(file, ctrl1.signal)
    await vi.waitFor(() => expect(injectScratchFontsToSvgText).toHaveBeenCalledTimes(1))
    const url2 = getRenderableImageUrl(file, ctrl2.signal)

    ctrl1.abort()
    resolveInjectedSvg('<svg>injected</svg>')

    await expect(url1).rejects.toBeDefined()
    await expect(url2).resolves.toBe('blob:mock-0')
    expect(injectScratchFontsToSvgText).toHaveBeenCalledTimes(1)
  })

  it('revokes URLs on abort', async () => {
    const file = fromText('costume.svg', '<svg><text font-family="Scratch">hello</text></svg>', {
      type: 'image/svg+xml'
    })
    const ctrl1 = new AbortController()
    const ctrl2 = new AbortController()

    const url1 = await getRenderableImageUrl(file, ctrl1.signal)
    const url2 = await getRenderableImageUrl(file, ctrl2.signal)

    ctrl1.abort()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url1)

    ctrl2.abort()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url2)
  })

  it('keeps plain SVG URLs on the normal file path', async () => {
    const file = fromText('costume.svg', '<svg><text font-family="Arial">hello</text></svg>', {
      type: 'image/svg+xml'
    })
    const ctrl = new AbortController()

    const url = await getRenderableImageUrl(file, ctrl.signal)

    expect(injectScratchFontsToSvgText).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    ctrl.abort()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
  })
})
